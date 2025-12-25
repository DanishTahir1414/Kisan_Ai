import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TouchableOpacity as GestureTouchableOpacity } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { CustomText, Heading } from "../components/customText";
import { locationData, provinces } from "../data/locationData";

// API Configuration
// Change this to your computer's IP address for mobile testing
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.18.226:3000/api" //YOUR COMPUTER'S IP ADDRESS HERE
    : "http://192.168.18.226:3000/api"; //YOUR COMPUTER'S IP ADDRESS HERE

// Define the Listing interface
interface Listing {
  _id: string;
  title: string;
  description: string;
  image?: string;
  contactNumber: string;
  price: number;
  location: {
    province: string;
    city: string;
    area: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

const MarketplaceScreen = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user and listings on component mount
  useEffect(() => {
    loadCurrentUser();
    fetchListings();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem("authToken");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      console.log("🔵 Fetching listings...");
      const response = await fetch(`${API_BASE_URL}/marketplace/listings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("🔵 Listings response:", data);

      if (response.ok) {
        setListings(data.listings || []);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to fetch listings",
        });
      }
    } catch (error: any) {
      console.error("🔴 Fetch listings error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to fetch listings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const pickImage = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Please grant media library access to select an image.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validatePhoneNumber = (number: string): boolean => {
    const phoneRegex = /^((\+92)|0)(3[0-4][0-9])[0-9]{7}$/;
    return phoneRegex.test(number);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUri(null);
    setProvince("");
    setCity("");
    setArea("");
    setContactNumber("");
    setPrice("");
  };

  const handleCreate = async (): Promise<void> => {
    if (
      !title.trim() ||
      !description.trim() ||
      !province ||
      !city ||
      !area ||
      !contactNumber.trim() ||
      !price.trim()
    ) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (!validatePhoneNumber(contactNumber)) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          "Please enter a valid Pakistani phone number (e.g., +923001234567 or 03001234567)",
      });
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a valid price greater than 0",
      });
      return;
    }

    setCreating(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to create a listing",
        });
        return;
      }

      console.log("🔵 Creating listing...");
      const listingData = {
        title: title.trim(),
        description: description.trim(),
        price: priceValue,
        image: imageUri,
        contactNumber: contactNumber.trim(),
        location: {
          province,
          city,
          area,
        },
      };

      const response = await fetch(`${API_BASE_URL}/marketplace/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(listingData),
      });

      const data = await response.json();

      if (response.ok) {
        setListings([data.listing, ...listings]);
        resetForm();
        setModalVisible(false);

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Listing created successfully!",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to create listing",
        });
      }
    } catch (error: any) {
      console.error("🔴 Create listing error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to create listing. Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setTitle(listing.title);
    setDescription(listing.description);
    setImageUri(listing.image || null);
    setProvince(listing.location.province);
    setCity(listing.location.city);
    setArea(listing.location.area);
    setContactNumber(listing.contactNumber);
    setPrice(listing.price.toString());
    setEditModalVisible(true);
  };

  const handleUpdateListing = async (): Promise<void> => {
    if (!editingListing) return;

    if (
      !title.trim() ||
      !description.trim() ||
      !province ||
      !city ||
      !area ||
      !contactNumber.trim() ||
      !price.trim()
    ) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (!validatePhoneNumber(contactNumber)) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a valid Pakistani phone number",
      });
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a valid price greater than 0",
      });
      return;
    }

    setUpdating(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to update listing",
        });
        return;
      }

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        price: priceValue,
        image: imageUri,
        contactNumber: contactNumber.trim(),
        location: {
          province,
          city,
          area,
        },
      };

      const response = await fetch(
        `${API_BASE_URL}/marketplace/listings/${editingListing._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setListings(
          listings.map((listing) =>
            listing._id === editingListing._id ? data.listing : listing
          )
        );

        resetForm();
        setEditModalVisible(false);
        setEditingListing(null);

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Listing updated successfully!",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to update listing",
        });
      }
    } catch (error: any) {
      console.error("🔴 Update listing error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to update listing. Please try again.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(listingId),
        },
      ]
    );
  };

  const performDelete = async (listingId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please login to delete listing",
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setListings(listings.filter((listing) => listing._id !== listingId));
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Listing deleted successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.message || "Failed to delete listing",
        });
      }
    } catch (error: any) {
      console.error("🔴 Delete listing error:", error);
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to delete listing. Please try again.",
      });
    }
  };

  const isUserListing = (listing: Listing): boolean => {
    return currentUser && listing.createdBy._id === currentUser.id;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const closeCreateModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingListing(null);
    resetForm();
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedListing(null);
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedListing(item);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.card}>
        <View style={styles.carimgholder}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listingImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.cardDetailsHolder}>
          <View style={styles.cardHeader}>
            <Heading style={styles.cardTitle}>{item.title}</Heading>
            {isUserListing(item) && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleEditListing(item)}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil-outline" size={18} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteListing(item._id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#e91e63" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* <CustomText style={styles.cardDescription}>
            {item.description}
          </CustomText> */}
          <View style={styles.cardInfo}>
            <Ionicons name="cash-outline" size={16} color="#039116" />
            <CustomText style={styles.cardPrice}>
              PKR {item.price.toLocaleString()}
            </CustomText>
          </View>
          <View style={styles.cardInfo}>
            <Ionicons name="location-outline" size={16} color="#777" />
            <CustomText style={styles.cardLocation}>
              {item.location.province}, {item.location.city},{" "}
              {item.location.area}
            </CustomText>
          </View>
          {/* <View style={styles.cardInfo}>
            <Ionicons name="call-outline" size={16} color="#777" />
            <CustomText style={styles.cardContact}>
              {item.contactNumber}
            </CustomText>
          </View> */}
          <View style={styles.cardInfo}>
            <Ionicons name="person-outline" size={16} color="#777" />
            <CustomText style={styles.cardSeller}>
              By: {item.createdBy.name}
            </CustomText>
          </View>
          <View style={styles.cardInfo}>
            <Ionicons name="time-outline" size={16} color="#999" />
            <CustomText style={styles.cardDate}>
              {formatDate(item.createdAt)}
            </CustomText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderModalContent = (isEdit: boolean = false) => (
    <ScrollView contentContainerStyle={styles.modalContent}>
      <Heading style={styles.modalTitle}>
        {isEdit ? "Edit Listing" : "New Listing"}
      </Heading>

      <TextInput
        placeholder="Title: Add a title about your listing"
        style={[styles.input, { fontFamily: "RobotoRegular" }]}
        value={title}
        onChangeText={setTitle}
        editable={!creating && !updating}
      />

      <TextInput
        placeholder="Description: Add a description about your listing"
        style={[styles.input, { height: 80, fontFamily: "RobotoRegular" }]}
        multiline
        value={description}
        onChangeText={setDescription}
        editable={!creating && !updating}
      />

      <TextInput
        placeholder="Price (PKR)"
        style={[styles.input, { fontFamily: "RobotoRegular" }]}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        editable={!creating && !updating}
      />

      <TextInput
        placeholder="Contact Number: e.g., +923001234567"
        style={[styles.input, { fontFamily: "RobotoRegular" }]}
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="phone-pad"
        editable={!creating && !updating}
      />

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={province}
          onValueChange={(value) => {
            setProvince(value);
            setCity("");
            setArea("");
          }}
          style={styles.picker}
          enabled={!creating && !updating}
        >
          <Picker.Item label="Select Province" value="" />
          {provinces.map((province) => (
            <Picker.Item key={province} label={province} value={province} />
          ))}
        </Picker>
      </View>

      {province && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={city}
            onValueChange={(value) => {
              setCity(value);
              setArea("");
            }}
            style={styles.picker}
            enabled={!creating && !updating}
          >
            <Picker.Item label="Select City" value="" />
            {Object.keys(locationData[province] || {}).map((city) => (
              <Picker.Item key={city} label={city} value={city} />
            ))}
          </Picker>
        </View>
      )}

      {city && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={area}
            onValueChange={setArea}
            style={styles.picker}
            enabled={!creating && !updating}
          >
            <Picker.Item label="Select Area" value="" />
            {locationData[province]?.[city]?.map((area) => (
              <Picker.Item key={area} label={area} value={area} />
            ))}
          </Picker>
        </View>
      )}

      <TouchableOpacity
        style={styles.imagePicker}
        onPress={pickImage}
        disabled={creating || updating}
      >
        <Ionicons name="image-outline" size={20} color="#2196F3" />
        <CustomText style={{ color: "#2196F3" }}>
          {imageUri ? "Change Image" : "Pick an Image"}
        </CustomText>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (creating || updating) && styles.disabledButton,
        ]}
        onPress={isEdit ? handleUpdateListing : handleCreate}
        disabled={creating || updating}
      >
        <CustomText style={styles.submitText}>
          {creating
            ? "Creating..."
            : updating
            ? "Updating..."
            : isEdit
            ? "Update Listing"
            : "Post Listing"}
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={isEdit ? closeEditModal : closeCreateModal}
        disabled={creating || updating}
      >
        <CustomText style={styles.cancelText}>Cancel</CustomText>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item._id}
        renderItem={renderListing}
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={64} color="#ccc" />
              <CustomText style={styles.emptyText}>
                No listings found
              </CustomText>
              <CustomText style={styles.emptySubText}>
                Be the first to create a listing!
              </CustomText>
            </View>
          ) : null
        }
      />

      {/* Create Listing Button */}
      <GestureTouchableOpacity
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={["#039116", "#06D001"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.btnHolder}>
            <Ionicons name="add-outline" size={24} color="white" />
            <CustomText style={styles.btnText}>Create Listing</CustomText>
          </View>
        </LinearGradient>
      </GestureTouchableOpacity>

      {/* Create Listing Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackground}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            {renderModalContent(false)}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Listing Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalBackground}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            {renderModalContent(true)}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Detail Listing Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeDetailModal}
      >
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity
              onPress={closeDetailModal}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Heading style={styles.detailModalTitle}>
              {selectedListing?.title}
            </Heading>
            <TouchableOpacity
              onPress={closeDetailModal}
              style={styles.closeButton}
            >
              {/* <Ionicons name="close" size={24} color="#333" /> */}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.detailModalContent}>
            {selectedListing?.image ? (
              <Image
                source={{ uri: selectedListing.image }}
                style={styles.detailModalImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={40} color="#ccc" />
              </View>
            )}
            <CustomText style={styles.detailModalDescription}>
              {selectedListing?.description}
            </CustomText>
            <View style={styles.detailModalInfo}>
              <Ionicons name="cash-outline" size={16} color="#039116" />
              <CustomText style={styles.detailModalPrice}>
                PKR {selectedListing?.price.toLocaleString()}
              </CustomText>
            </View>
            <View style={styles.detailModalInfo}>
              <Ionicons name="location-outline" size={16} color="#777" />
              <CustomText style={styles.detailModalLocation}>
                {selectedListing?.location.province},{" "}
                {selectedListing?.location.city},{" "}
                {selectedListing?.location.area}
              </CustomText>
            </View>
            <View style={styles.detailModalInfo}>
              <Ionicons name="call-outline" size={16} color="#777" />
              <CustomText style={styles.detailModalContact}>
                {selectedListing?.contactNumber}
              </CustomText>
            </View>
            <View style={styles.detailModalInfo}>
              <Ionicons name="person-outline" size={16} color="#777" />
              <CustomText style={styles.detailModalSeller}>
                By: {selectedListing?.createdBy.name}
              </CustomText>
            </View>
            <View style={styles.detailModalInfo}>
              <Ionicons name="time-outline" size={16} color="#999" />
              <CustomText style={styles.detailModalDate}>
                {formatDate(selectedListing?.createdAt || "")}
              </CustomText>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default MarketplaceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  btnHolder: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 180,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  carimgholder: {
    width: "40%",
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
  },
  cardDetailsHolder: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 6,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 14,
    color: "#039116",
    fontWeight: "600",
  },
  cardLocation: {
    fontSize: 13,
    color: "#777",
    flex: 1,
  },
  cardContact: {
    fontSize: 13,
    color: "#777",
  },
  cardSeller: {
    fontSize: 13,
    color: "#777",
  },
  cardDate: {
    fontSize: 12,
    color: "#999",
  },
  listingImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    objectFit: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalContent: {
    gap: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0f2ff",
    padding: 10,
    borderRadius: 12,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelText: {
    color: "#777",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 10,
  },
  closeButton: {
    padding: 10,
  },
  detailModalContent: {
    paddingBottom: 20,
  },
  detailModalImage: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
    objectFit: "cover",
  },
  detailModalDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 15,
  },
  detailModalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailModalPrice: {
    fontSize: 18,
    color: "#039116",
    fontWeight: "600",
  },
  detailModalLocation: {
    fontSize: 15,
    color: "#777",
    flex: 1,
  },
  detailModalContact: {
    fontSize: 15,
    color: "#777",
  },
  detailModalSeller: {
    fontSize: 15,
    color: "#777",
  },
  detailModalDate: {
    fontSize: 14,
    color: "#999",
  },
});
