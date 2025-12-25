import { SafeAreaView, StyleSheet, ViewStyle } from "react-native";
import React, { useState } from "react";
import { Tabs, useSegments } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Header from "../components/Header";
import { CustomText } from "../components/customText";
import AntDesign from '@expo/vector-icons/AntDesign';
import Toast from "react-native-toast-message";
import toastConfig from "../toastconfig";

interface Post {
  id: string;
  name: string;
  avatar: string;
  image: string | null;
  text: string;
  timestamp: Date;
  likes: number;
  comments: any[];
  commentCount: number;
}

const TabRoot = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const segments = useSegments();
  const currentTab = segments[segments.length - 1];

  const handlePost = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: true,
            header: () => <Header onPost={handlePost} />,
            tabBarStyle: currentTab === "Home" ? styles.tabBar : { display: "none" },
            tabBarActiveTintColor: "#039116",
            tabBarInactiveTintColor: "#9CA3AF",
            tabBarIconStyle: {
              justifyContent: "center",
              alignItems: "center",
            },
            tabBarLabel: ({ children, color }) => (
              <CustomText style={{ fontSize: 12, color, fontFamily: "RobotoRegular" }}>
                {children}
              </CustomText>
            ),
          }}
        >
          <Tabs.Screen
            name="Home"
            options={{
              title: "Home",
              tabBarIcon: ({ color }) => <FontAwesome size={22} name="home" color={color} />,
            }}
          />
          <Tabs.Screen
            name="Community"
            options={{
              title: "Community",
              tabBarIcon: ({ color }) => <FontAwesome5 name="user-friends" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="Marketplace"
            options={{
              title: "Marketplace",
              tabBarIcon: ({ color }) => <Entypo name="shop" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="Camera"
            options={{
              title: "Diagnose",
              tabBarIcon: ({ color }) => <MaterialCommunityIcons size={22} name="leaf" color={color} />,
            }}
          />
          <Tabs.Screen
            name="Weather"
            options={{
              title: "Weather",
              tabBarIcon: ({ color }) => <MaterialCommunityIcons size={22} name="weather-lightning-rainy" color={color} />,
            }}
          />
          <Tabs.Screen
            name="Irrigation"
            options={{
              title: "Irrigation",
              tabBarIcon: ({ color }) => <MaterialCommunityIcons size={22} name="water-pump" color={color} />,
            }}
          />
          <Tabs.Screen
            name="Profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <AntDesign name="user" size={24} color={color} />,
            }}
          />
        </Tabs>
      </SafeAreaView>
      <Toast config={toastConfig}/>
    </>
  );
};

export default TabRoot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  } as ViewStyle,
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderTopColor: "#e0e0e0",
    borderTopWidth: 1,
  } as ViewStyle,
});