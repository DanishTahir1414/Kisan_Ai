import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useState } from "react";
import { Image, ImageStyle, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { CustomText, Heading } from "../components/customText";
import CropYieldPredictionCard from "../components/CropYieldPredictionCard";
import { useTranslation } from 'react-i18next';


// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://192.168.18.226:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE


interface Diagnosis {
  _id: string;
  imageUrl: string;
  cropName: string;
  diagnosisResult: {
    diseaseName: string;
    confidence?: number;
    treatment?: string;
  };
  createdAt: string;
}

const HomeScreen = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState<string>("User");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);



  const fetchUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData?.name) {
          setUsername(userData.name);
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "User data is incomplete.",
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No user data found. Please log in again.",
        });
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load user data.",
      });
    }
  };

  const fetchDiagnosisHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please log in to view diagnosis history",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/diagnosis?page=1&limit=10`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          throw new Error(`Failed to fetch diagnosis history (Status: ${response.status})`);
        }
        throw new Error(errorData.errors?.[0]?.message || "Failed to fetch diagnosis history");
      }

      const data = await response.json();
      console.log("Diagnosis API response:", JSON.stringify(data, null, 2));
      const diagnosesData = Array.isArray(data.data?.diagnoses) ? data.data.diagnoses : [];
      setDiagnoses(diagnosesData);
    } catch (error: any) {
      console.error("Error fetching diagnosis history:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load diagnosis history",
      });
      setDiagnoses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDiagnosisPress = (diagnosis: Diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setModalVisible(true);
  };

  // Save irrigation alert to AsyncStorage notifications
  async function saveIrrigationNotification(alertMsg: string) {
    try {
      const existing = await AsyncStorage.getItem("irrigationAlerts");
      let alerts = existing ? JSON.parse(existing) : [];
      alerts = alerts.map((a: any) => ({ ...a, read: typeof a.read === "boolean" ? a.read : false }));
      alerts.unshift({ message: alertMsg, timestamp: new Date().toISOString(), read: false });
      await AsyncStorage.setItem("irrigationAlerts", JSON.stringify(alerts));
    } catch (error) {
      console.error("Error saving irrigation notification:", error);
    }
  }

  // Fetch irrigation alert and show notification
  const fetchIrrigationAlert = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      const token = await AsyncStorage.getItem("authToken");
      const crop = await AsyncStorage.getItem("selectedCrop");
      if (!token || !crop) return;
      const res = await fetch(`${API_BASE_URL}/irrigation/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ lat: loc.coords.latitude, lon: loc.coords.longitude, crop }),
      });
      const data = await res.json();
      const alertMsg = data.alert || "No irrigation alert available.";
      // Check last saved alert
      const existing = await AsyncStorage.getItem("irrigationAlerts");
      let alerts = existing ? JSON.parse(existing) : [];
      const lastAlert = alerts.length > 0 ? alerts[0] : null;
      const now = Date.now();
      let showToast = false;
      if (!lastAlert) {
        showToast = true;
      } else {
        const lastMsg = lastAlert.message;
        const lastTime = new Date(lastAlert.timestamp).getTime();
        // Show if message changed or last alert older than 24h
        if (alertMsg !== lastMsg || (now - lastTime) > 24 * 60 * 60 * 1000) {
          showToast = true;
        }
      }
      if (showToast) {
        await saveIrrigationNotification(alertMsg);
        Toast.show({ type: "info", text1: "Irrigation Schedule", text2: alertMsg });
      }
    } catch (err) {
      // Optionally show error toast
    }
  };

  

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      fetchDiagnosisHistory();
      // Fetch irrigation alert automatically when Home tab is focused
      fetchIrrigationAlert();
    }, [fetchDiagnosisHistory])
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={["#039116", "#06D001"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headingContent}>
            <Heading style={styles.headerTitle}>{t('home.welcome_back', { username })}</Heading>
            <CustomText style={styles.headerSubtitle}>
              {t('home.explore_message')}
            </CustomText>
          </View>
        </LinearGradient>

        <View style={styles.diagnosisSection}>
          <Heading style={styles.diagnosisTitle}>{t('home.your_diagnosed_crops')}</Heading>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="leaf-outline" size={40} color="#039116" />
              <CustomText style={styles.noDiagnosesText}>{t('home.loading_diagnoses')}</CustomText>
            </View>
          ) : diagnoses.length === 0 ? (
            <View style={styles.noDiagnosesContainer}>
              <Ionicons name="leaf-outline" size={40} color="#039116" />
              <CustomText style={styles.noDiagnosesText}>
                {t('home.no_diagnoses_yet')}
              </CustomText>
            </View>
          ) : (
            <View style={styles.diagnosisGrid}>
              {diagnoses.map((diagnosis) => (
                <TouchableOpacity
                  key={diagnosis._id}
                  style={styles.diagnosisBox}
                  onPress={() => handleDiagnosisPress(diagnosis)}
                >
                  <Image
                    source={{ uri: diagnosis.imageUrl }}
                    style={styles.diagnosisImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error("Image load error:", error.nativeEvent.error, "URL:", diagnosis.imageUrl);
                      // Toast.show({
                      //   type: "error",
                      //   text1: "Image Load Error",
                      //   text2: "Failed to load diagnosis image",
                      // });
                    }}
                  />
                  <View style={styles.diagnosisContent}>
                    <CustomText style={styles.diagnosisCrop}>
                      {diagnosis.cropName && typeof diagnosis.cropName === "string" ? diagnosis.cropName.charAt(0).toUpperCase() + diagnosis.cropName.slice(1) : "-"}
                    </CustomText>
                    <CustomText style={styles.diagnosisDisease}>
                      {diagnosis.diagnosisResult.diseaseName}
                    </CustomText>
                    {diagnosis.diagnosisResult.confidence && (
                      <CustomText style={styles.diagnosisConfidence}>
                        {t('home.confidence_label', { confidence: diagnosis.diagnosisResult.confidence })}
                      </CustomText>
                    )}
                    {diagnosis.diagnosisResult.treatment && (
                      <CustomText style={styles.diagnosisTreatment} numberOfLines={3}>
                        {t('home.treatment_label', { treatment: diagnosis.diagnosisResult.treatment })}
                      </CustomText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Crop Yield Prediction Card */}
          <CropYieldPredictionCard style={{ marginTop: 16 }} />
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Heading style={styles.modalTitle}>
                {t('home.analysis_result_title', { cropName: selectedDiagnosis && selectedDiagnosis.cropName
                  ? (selectedDiagnosis.cropName && typeof selectedDiagnosis.cropName === "string" ? selectedDiagnosis.cropName.charAt(0).toUpperCase() + selectedDiagnosis.cropName.slice(1) : "-")
                  : "" })}
              </Heading>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2A44" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedDiagnosis && (
                <>
                  <Image
                    source={{ uri: selectedDiagnosis.imageUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error("Modal image load error:", error.nativeEvent.error, "URL:", selectedDiagnosis.imageUrl);
                      Toast.show({
                        type: "error",
                        text1: "Image Load Error",
                        text2: "Failed to load diagnosis image",
                      });
                    }}
                  />
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="medical" size={20} color="#039116" />
                      <Heading style={styles.sectionTitle}>{t('home.disease_diagnosis')}</Heading>
                    </View>
                    <CustomText style={styles.diagnosisText}>
                      {t('home.disease_label', { disease: selectedDiagnosis.diagnosisResult.diseaseName })}
                      {selectedDiagnosis.diagnosisResult.confidence && (
                        `\n${t('home.confidence_label', { confidence: selectedDiagnosis.diagnosisResult.confidence })}`
                      )}
                    </CustomText>
                  </View>
                  {selectedDiagnosis.diagnosisResult.treatment && (
                    <View style={styles.resultSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="leaf" size={20} color="#039116" />
                        <Heading style={styles.sectionTitle}>{t('home.treatment_recommendation')}</Heading>
                      </View>
                      <CustomText style={styles.cureText}>
                        {t('home.treatment_label', { treatment: selectedDiagnosis.diagnosisResult.treatment })}
                      </CustomText>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            {/* <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <CustomText style={styles.closeButtonText}>Close</CustomText>
            </TouchableOpacity> */}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
  },
  headerGradient: {
    borderRadius: 16,
    marginBottom: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  headingContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#F3F4F6",
  },
  diagnosisSection: {
    marginBottom: 24,
  },
  diagnosisTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2A44",
    marginBottom: 16,
    textAlign: "left",
  },
  noDiagnosesContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noDiagnosesText: {
    fontSize: 16,
    color: "#1F2A44",
    textAlign: "center",
    marginTop: 8,
  },
  diagnosisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  diagnosisBox: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  diagnosisImage: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  } as ImageStyle,
  diagnosisContent: {
    padding: 12,
  },
  diagnosisCrop: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
    marginBottom: 4,
  },
  diagnosisDisease: {
    fontSize: 14,
    color: "#1F2A44",
    marginBottom: 4,
  },
  diagnosisConfidence: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  diagnosisTreatment: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-end",
    alignItems:"center"
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    minHeight: 400,
    maxHeight: "80%",
    width:"90%",
    padding: 16,
    marginBottom:20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 16,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  } as ImageStyle,
  resultSection: {
    width: "100%",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#039116",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#1F2A44",
  },
  diagnosisText: {
    fontSize: 15,
    color: "#1F2A44",
    lineHeight: 22,
  },
  cureText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    textAlign: "left",
  },
  closeButton: {
    backgroundColor: "#039116",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default HomeScreen;