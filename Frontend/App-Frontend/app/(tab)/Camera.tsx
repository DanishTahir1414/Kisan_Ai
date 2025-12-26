import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageStyle,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { CustomText, Heading } from "../components/customText";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// API Configuration
// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://192.168.18.226:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE
const TOMATO_DIAGNOSIS_API = "http://192.168.18.226:8000/predict-tomato";
const COTTON_DIAGNOSIS_API = "http://192.168.18.226:8000/predict-cotton";
const MANGO_DIAGNOSIS_API = "http://192.168.18.226:8000/predict-mango";
const RICE_DIAGNOSIS_API = "http://192.168.18.226:8000/predict-rice";
const CURE_SUGGESTION_API = "http://192.168.18.226:8000/get-cure-suggestion";
const DIAGNOSIS_SAVE_API = `${API_BASE_URL}/diagnosis`;

const Camera = () => {
  const { t, i18n } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [diagnosisResponse, setDiagnosisResponse] = useState<string>("");
  const [cureResponse, setCureResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const soundObjectRef = useRef<Audio.Sound | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem("authToken");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  // Function to convert disease name to a translation key
  const getDiseaseTranslationKey = (diseaseName: string): string => {
    return diseaseName.replace(/ /g, "_").toLowerCase();
  };

  // Function to determine severity based on confidence and disease name
  const determineSeverity = (confidence: number, diseaseName: string): string => {
    if (confidence >= 85) return "mild";
    
    const severeKeywords = ["blight", "wilt", "rot", "virus", "bacterial"];
    const moderateKeywords = ["spot", "rust", "mildew"];
    
    const diseaseNameLower = diseaseName.toLowerCase();
    
    for (const keyword of severeKeywords) {
      if (diseaseNameLower.includes(keyword)) {
        return confidence >= 70 ? "moderate" : "severe";
      }
    }
    
    for (const keyword of moderateKeywords) {
      if (diseaseNameLower.includes(keyword)) {
        return confidence >= 75 ? "mild" : "moderate";
      }
    }
    
    if (confidence >= 75) return "mild";
    if (confidence >= 60) return "moderate";
    return "severe";
  };

  const getCureSuggestion = async (crop: string, diseaseName: string, confidence: number) => {
    try {
      setLoadingStage(t('camera.getting_cure_suggestion'));
      
      const severity = determineSeverity(confidence, diseaseName);
      const currentLanguage = i18n.language;
      
      const requestBody = {
        plant_type: crop.toLowerCase(),
        predicted_class: diseaseName,
        confidence: confidence / 100,
        severity: severity,
        language: currentLanguage,
      };

      console.log("Cure API request:", requestBody);

      const response = await fetch(CURE_SUGGESTION_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Cure API response:", data);

      if (response.ok && data.success) {
       return data.cure_suggestion; // Remove truncation - let full response come through
      } else {
        console.error("Cure API error:", data);
        return t('camera.unable_to_get_cure');
      }
    } catch (error) {
      console.error("Error getting cure suggestion:", error);
      return t('camera.network_error_cure');
    }
  };

  const saveDiagnosisToBackend = async (
    crop: string, 
    uri: string, 
    diagnosis: { diseaseName: string; confidence: string },
    cureText: string = ""
  ) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      if (!crop || crop.length < 2 || crop.length > 50) {
        throw new Error("Crop name must be between 2 and 50 characters");
      }

      if (!diagnosis.diseaseName || diagnosis.diseaseName.length < 2 || diagnosis.diseaseName.length > 100) {
        throw new Error("Disease name must be between 2 and 100 characters");
      }

      const confidenceValue = diagnosis.confidence === "N/A" ? undefined : parseFloat(diagnosis.confidence);
      if (confidenceValue !== undefined && (isNaN(confidenceValue) || confidenceValue < 0 || confidenceValue > 100)) {
        throw new Error("Confidence must be a number between 0 and 100");
      }

      const requestBody = {
        imageUrl: uri,
        cropName: crop,
        diagnosisResult: {
          diseaseName: diagnosis.diseaseName,
          ...(confidenceValue !== undefined && { confidence: confidenceValue }),
          ...(cureText && { cureSuggestion: cureText }),
        },
      };

      console.log("Saving diagnosis with body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(DIAGNOSIS_SAVE_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error("Diagnosis save error response:", JSON.stringify(errorData, null, 2));
          throw new Error(errorData.errors?.[0]?.msg || errorData.message || `Failed to save diagnosis (Status: ${response.status})`);
        } catch (jsonError) {
          throw new Error(`Failed to save diagnosis (Status: ${response.status})`);
        }
      }

      Toast.show({
        type: "success",
        text1: t('camera.success'),
        text2: t('camera.diagnosis_saved'),
      });
    } catch (error: any) {
      console.error("Error saving diagnosis:", error.message, error);
      Toast.show({
        type: "error",
        text1: t('camera.error_saving_diagnosis'),
        text2: error.message || t('camera.failed_save_diagnosis'),
      });
    }
  };

  const diagnoseCrop = async (crop: string, uri: string) => {
    setIsLoading(true);
    setLoadingStage(t('camera.analyzing_image'));
    setCureResponse("");
    
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: t('auth.error'),
          text2: t('camera.login_to_diagnose'),
        });
        return;
      }

      const apiEndpoints: { [key: string]: string } = {
        rice: RICE_DIAGNOSIS_API,
        cotton: COTTON_DIAGNOSIS_API,
        mango: MANGO_DIAGNOSIS_API,
        guava: `${API_BASE_URL}/diagnose/guava`,
        tomato: TOMATO_DIAGNOSIS_API,
      };

      const endpoint = apiEndpoints[crop.toLowerCase()];
      if (!endpoint) {
        Toast.show({
          type: "error",
          text1: t('common.error'),
          text2: t('camera.invalid_crop'),
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `crop_image_${crop}.jpg`,
        type: "image/jpeg",
      } as any);

      if (["tomato", "cotton", "mango", "rice"].includes(crop.toLowerCase())) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });

        const data = await response.json();
        if (response.ok) {
          if (data.prediction && data.prediction.predicted_class) {
            const prefix =
              crop.toLowerCase() === "tomato" ? "Tomato___" :
              crop.toLowerCase() === "cotton" ? "Cotton___" :
              crop.toLowerCase() === "mango" ? "Mango___" :
              "Rice___";
            const predictedClass = data.prediction.predicted_class.replace(prefix, "");
            const confidence = data.prediction.percentage || 0;
            const confidenceText = confidence ? `${confidence}%` : "N/A";
            
            const diseaseKey = getDiseaseTranslationKey(predictedClass);
            const translatedDisease = t(`diseases.${diseaseKey}`, { defaultValue: predictedClass });

            setDiagnosisResponse(`${t('home.disease_label')}: ${translatedDisease}\n${t('home.confidence_label')}: ${confidenceText}`);

            if (confidence > 0) {
              const cureText = await getCureSuggestion(crop, predictedClass, confidence);
              setCureResponse(cureText);
              
              await saveDiagnosisToBackend(crop, uri, {
                diseaseName: predictedClass,
                confidence: confidence.toString(),
              }, cureText); // We save the translated cure text
            } else {
              await saveDiagnosisToBackend(crop, uri, {
                diseaseName: predictedClass,
                confidence: "N/A",
              });
            }
          } else {
            console.error("Unexpected API response:", data);
            Toast.show({
              type: "error",
              text1: t('common.error'),
              text2: t('camera.invalid_response'),
            });
            setDiagnosisResponse(t('camera.no_diagnosis'));
          }
        } else {
          Toast.show({
            type: "error",
            text1: t('common.error'),
            text2: data.detail || t('camera.failed_to_diagnose', { crop }),
          });
          return;
        }
      } else {
        const mockResponse = {
          diagnosis: `Mock diagnosis for ${crop}: Healthy (this is a placeholder response until the API is ready).`,
        };
        setDiagnosisResponse(mockResponse.diagnosis);
        setCureResponse("This crop is healthy. Continue with regular care and monitoring.");

        await saveDiagnosisToBackend(crop, uri, {
          diseaseName: "Healthy",
          confidence: "N/A",
        }, "This crop is healthy. Continue with regular care and monitoring.");
      }

      setImageUri(uri);
      setModalVisible(true);
    } catch (error: any) {
      console.error(`Diagnosis error for ${crop}:`, error);
      Toast.show({
        type: "error",
        text1: t('error.network'),
        text2: t('camera.cannot_reach_server'),
      });
    } finally {
      setIsLoading(false);
      setLoadingStage("");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && selectedCrop) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        await diagnoseCrop(selectedCrop, photo.uri);
      } catch (error) {
        Alert.alert("Error", "Could not take picture: " + (error as Error).message);
      }
    }
  };

  const pickImageFromGallery = async () => {
    if (!selectedCrop) {
      Toast.show({
        type: "error",
        text1: t('common.error'),
        text2: t('camera.select_crop_first'),
      });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: t('permissions.denied'),
        text2: t('permissions.grantMediaLibraryAccess'),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await diagnoseCrop(selectedCrop, result.assets[0].uri);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const selectCrop = (crop: string) => {
    setSelectedCrop(crop);
    setIsCameraOpen(true);
  };

  const goBackToInitial = () => {
    setIsCameraOpen(false);
    setSelectedCrop(null);
    setImageUri(null);
    setDiagnosisResponse("");
    setCureResponse("");
    setModalVisible(false);
    setLoadingStage("");
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsCameraOpen(false);
      setSelectedCrop(null);
      setImageUri(null);
      setDiagnosisResponse("");
      setCureResponse("");
      setModalVisible(false);
      setLoadingStage("");
      return () => {};
    }, [])
  );

  // Azure TTS via Backend
  const speakText = async (text: string) => {
    try {
      // If already loading or speaking, stop
      if (isSpeechLoading || isSpeaking) {
        await stopSpeech();
        return;
      }

      setIsSpeechLoading(true);
      
      // Clean text (preserve existing logic)
      const cleanText = text
        .replace(/[#*_`]/g, '') // Remove markdown symbols only
        .replace(/\n+/g, '. ') // Replace newlines with pauses
        .replace(/:/g, '. ') // Replace colons with pauses
        .replace(/([A-Za-z]+_[A-Za-z_]+)/g, (match) => {
          return match.replace(/_/g, ' ');
        })
        .replace(/\s+/g, ' ')
        .trim();

      console.log('Original text:', text);
      console.log('Cleaned text for speech:', cleanText);

      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: t('auth.error'),
          text2: t('camera.login_to_use_tts'),
        });
        setIsSpeechLoading(false);
        return;
      }

      // Request audio from backend
      const response = await fetch(`${API_BASE_URL}/tts/speak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          language: i18n.language === 'ur' ? 'ur' : 'en',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate speech');
      }

      const data = await response.json();
      
      if (!data.success || !data.audio) {
        throw new Error('Invalid response from speech service');
      }

      // Save Base64 audio to file
      const audioUri = `${FileSystem.cacheDirectory}speech.mp3`;
      await FileSystem.writeAsStringAsync(audioUri, data.audio, {
        encoding: 'base64',
      });

      // Unload previous sound if exists
      if (soundObjectRef.current) {
        await soundObjectRef.current.unloadAsync();
        soundObjectRef.current = null;
      }

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              setIsSpeaking(false);
              sound.unloadAsync();
              soundObjectRef.current = null;
            }
          }
        }
      );

      soundObjectRef.current = sound;
      setIsSpeaking(true);
      setIsSpeechLoading(false);

    } catch (error: any) {
      console.error('Text to speech error:', error);
      setIsSpeaking(false);
      setIsSpeechLoading(false);
      Toast.show({
        type: "error",
        text1: t('common.error'),
        text2: error.message || t('camera.speech_not_available'),
      });
    }
  };

  const speakDiagnosisResult = () => {
    if (diagnosisResponse) {
      const textToSpeak = `${t('camera.diagnosis_result')}: ${diagnosisResponse}`;
      speakText(textToSpeak);
    }
  };

  const speakCureSuggestion = () => {
    if (cureResponse) {
      const textToSpeak = `${t('home.treatment_recommendation')}: ${cureResponse}`;
      speakText(textToSpeak);
    }
  };

  const stopSpeech = async () => {
    try {
      if (soundObjectRef.current) {
        await soundObjectRef.current.stopAsync();
        await soundObjectRef.current.unloadAsync();
        soundObjectRef.current = null;
      }
      setIsSpeaking(false);
      setIsSpeechLoading(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
      setIsSpeaking(false);
      setIsSpeechLoading(false);
    }
  };

  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (soundObjectRef.current) {
        soundObjectRef.current.unloadAsync();
      }
    };
  }, []);



  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          {t('camera.permission_needed')}
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionText}>{t('camera.grant_permission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isCameraOpen && !selectedCrop ? (
        <View style={styles.initialView}>
          <Text style={styles.instruction}>
            {t('camera.instruction')}
          </Text>
          <View style={styles.cropContainer}>
            {["rice", "cotton", "mango", "guava", "tomato"].map((crop) => (
              <TouchableOpacity
                key={crop}
                style={styles.cropBox}
                onPress={() => selectCrop(crop)}
              >
                <View style={styles.cropImageContainer}>
                  <Image
                    source={
                      crop === "rice"
                        ? require("../../assets/images/rice-.png")
                        : crop === "cotton"
                        ? require("../../assets/images/cotton-.png")
                        : crop === "mango"
                        ? require("../../assets/images/mango-.png")
                        : crop === "guava"
                        ? require("../../assets/images/-guava-.png")
                        : require("../../assets/images/tomato.png")
                    }
                    style={styles.cropImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cropText}>
                  {crop.charAt(0).toUpperCase() + crop.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <>
          <CameraView
            style={styles.camera as ViewStyle}
            facing={facing}
            ref={cameraRef}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#039116" />
              <CustomText style={styles.loadingTextOverlay}>
                {loadingStage || t('camera.processing_image')}
              </CustomText>
            </View>
          )}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickImageFromGallery}
              disabled={isLoading}
            >
              <Ionicons name="images-outline" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isLoading}
            >
              <Ionicons name="camera-outline" size={40} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

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
                {t('camera.analysis_result_for', { crop: selectedCrop ? t(`crops.${selectedCrop}`) : '' })}
              </Heading>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2A44" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#039116" />
                  <CustomText style={styles.loadingText}>
                    {loadingStage || t('camera.processing_image')}
                  </CustomText>
                </View>
              ) : (
                <>
                  {imageUri && (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  )}
                  
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="medical" size={20} color="#039116" />
                      <Heading style={styles.sectionTitle}>{t('home.disease_diagnosis')}</Heading>
                      <TouchableOpacity
                        style={styles.speakButton}
                        onPress={speakDiagnosisResult}
                        disabled={!diagnosisResponse || isSpeechLoading}
                      >
                        {isSpeechLoading ? (
                          <ActivityIndicator size="small" color="#039116" />
                        ) : (
                          <Ionicons 
                            name={isSpeaking ? "stop" : "volume-high"} 
                            size={16} 
                            color="#039116" 
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                    <CustomText style={styles.diagnosisText}>
                      {diagnosisResponse || t('camera.no_diagnosis')}
                    </CustomText>
                  </View>

                  {cureResponse && (
                    <View style={styles.resultSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="leaf" size={20} color="#039116" />
                        <Heading style={styles.sectionTitle}>{t('home.treatment_recommendation')}</Heading>
                        <TouchableOpacity
                          style={styles.speakButton}
                          onPress={speakCureSuggestion}
                          disabled={!cureResponse || isSpeechLoading}
                        >
                          {isSpeechLoading ? (
                            <ActivityIndicator size="small" color="#039116" />
                          ) : (
                            <Ionicons 
                              name={isSpeaking ? "stop" : "volume-high"} 
                              size={16} 
                              color="#039116" 
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                      <ScrollView 
                        style={styles.cureScrollContainer}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        <CustomText style={styles.cureText}>
                          {cureResponse}
                        </CustomText>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                stopSpeech(); // Stop speech when closing modal
                setModalVisible(false);
              }}
              disabled={isLoading}
            >
              <CustomText style={styles.closeButtonText}>{t('common.close')}</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
  } as ViewStyle,
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "#fff",
  } as TextStyle,
  initialView: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 80,
  } as ViewStyle,
  instruction: {
    color: "#000",
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
  } as TextStyle,
  loadingText: {
    textAlign: "center",
    color: "#fff",
    marginTop: 10,
  } as TextStyle,
  loadingTextOverlay: {
    color: "#fff",
    marginTop: 10,
    fontSize: 18,
    fontWeight: "500",
  } as TextStyle,
  cropContainer: {
    gap: 5,
    width: "100%",
    marginVertical: 20,
  } as ViewStyle,
  cropBox: {
    width: "95%",
    height: 80,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    margin: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    backgroundColor: "#f5f0f0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  } as ViewStyle,
  cropImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  } as ViewStyle,
  cropImage: {
    width: "100%",
    height: "100%",
  } as ImageStyle,
  cropText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "left",
    flex: 1,
  } as TextStyle,
  camera: {
    flex: 1,
  } as ViewStyle,
  controls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  } as ViewStyle,
  backButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 50,
  } as ViewStyle,
  galleryButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 50,
  } as ViewStyle,
  captureButton: {
    width: 70,
    height: 70,
    backgroundColor: "#fff",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#039116",
  } as ViewStyle,
  flipButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 50,
  } as ViewStyle,
  permissionButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "center",
  } as ViewStyle,
  permissionText: {
    color: "#000",
    fontWeight: "bold",
  } as TextStyle,
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-end",
  } as ViewStyle,
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    minHeight: 400,
    maxHeight: "80%",
    padding: 16,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 8,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
  modalContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 16,
  } as ViewStyle,
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
  } as ViewStyle,
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Changed to space-between for speak button
    marginBottom: 8,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#1F2A44",
  } as TextStyle,
  diagnosisText: {
    fontSize: 15,
    color: "#1F2A44",
    lineHeight: 22,
  } as TextStyle,
  cureText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    textAlign: "left",
  } as TextStyle,
  cureScrollContainer: {
    maxHeight: 200, // Fixed height instead of percentage
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  closeButton: {
    backgroundColor: "#039116",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  } as ViewStyle,
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  speakButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F0F8F0",
    marginLeft: "auto",
  } as ViewStyle,
  speechControlsContainer: {
    marginVertical: 16,
    alignItems: 'center',
  } as ViewStyle,
  speechControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#039116',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    justifyContent: 'center',
  } as ViewStyle,
  speechControlButtonActive: {
    backgroundColor: '#d32f2f',
  } as ViewStyle,
  speechControlButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  } as TextStyle,
});

export default Camera;