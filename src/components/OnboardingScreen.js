import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KARINDERYA_TYPES } from "../constants";

export default function OnboardingScreen({ onComplete }) {
  const [selectedType, setSelectedType] = useState(KARINDERYA_TYPES[0]);
  const [useStarterPack, setUseStarterPack] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.onboardingContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.onboardingMark}>
          <Ionicons name="flame-outline" size={32} color="#f7f3ea" />
        </View>

        <Text style={styles.onboardingEyebrow}>Luto nang matalino</Text>
        <Text style={styles.onboardingTitle}>Welcome to Kusinera</Text>
        <Text style={styles.onboardingText}>
          Built for karinderya owners who need offline inventory tracking,
          recipe matches, and missing-ingredient lists.
        </Text>

        <View style={styles.setupSection}>
          <Text style={styles.setupTitle}>
            What kind of karinderya do you run?
          </Text>

          {KARINDERYA_TYPES.map((type) => {
            const isSelected = selectedType === type;

            return (
              <Pressable
                key={type}
                style={[
                  styles.choiceButton,
                  isSelected && styles.selectedChoice,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={isSelected ? "#2D6A4F" : "#7a8179"}
                />
                <Text
                  style={[
                    styles.choiceText,
                    isSelected && styles.selectedChoiceText,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.starterPackCard,
            useStarterPack && styles.selectedStarterPack,
          ]}
          onPress={() => setUseStarterPack(!useStarterPack)}
        >
          <View style={styles.starterPackHeader}>
            <View>
              <Text style={styles.starterPackTitle}>
                Typical starter inventory
              </Text>
              <Text style={styles.starterPackText}>
                Add rice, pork, chicken, oil, garlic, onion, soy sauce, vinegar,
                and other common karinderya ingredients.
              </Text>
            </View>
            <Ionicons
              name={useStarterPack ? "checkbox" : "square-outline"}
              size={24}
              color="#2D6A4F"
            />
          </View>
        </Pressable>

        <View style={styles.privacyBox}>
          <Ionicons name="shield-checkmark-outline" size={23} color="#2D6A4F" />
          <Text style={styles.privacyText}>
            MVP data is stored locally on this device. No inventory data is
            uploaded to the cloud.
          </Text>
        </View>

        <Pressable
          style={styles.onboardingButton}
          onPress={() => onComplete({ selectedType, useStarterPack })}
        >
          <Text style={styles.onboardingButtonText}>
            Start managing inventory
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    backgroundColor: "#2D6A4F",
    flex: 1,
  },
  onboardingContent: {
    padding: 22,
    paddingBottom: 34,
  },
  onboardingMark: {
    alignItems: "center",
    backgroundColor: "#2D6A4F",
    borderRadius: 8,
    height: 58,
    justifyContent: "center",
    marginBottom: 20,
    width: 58,
  },
  onboardingEyebrow: {
    color: "#C77B12",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  onboardingTitle: {
    color: "#1c2a22",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    marginBottom: 8,
  },
  onboardingText: {
    color: "#69746c",
    fontSize: 15,
    marginTop: 8,
  },
  setupSection: {
    marginTop: 28,
  },
  setupTitle: {
    color: "#1c2a22",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  choiceButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eadfcb",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 14,
  },
  selectedChoice: {
    backgroundColor: "#e1f3e7",
    borderColor: "#2D6A4F",
  },
  choiceText: {
    color: "#5f655f",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  selectedChoiceText: {
    color: "#2D6A4F",
  },
  starterPackCard: {
    backgroundColor: "#ffffff",
    borderColor: "#eadfcb",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  selectedStarterPack: {
    borderColor: "#2D6A4F",
  },
  starterPackHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  starterPackTitle: {
    color: "#1c2a22",
    fontSize: 16,
    fontWeight: "800",
  },
  starterPackText: {
    color: "#69746c",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  privacyBox: {
    alignItems: "flex-start",
    backgroundColor: "#fff8e8",
    borderColor: "#f0dfb5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  privacyText: {
    color: "#5f655f",
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  onboardingButton: {
    alignItems: "center",
    backgroundColor: "#2D6A4F",
    borderRadius: 8,
    marginTop: 18,
    paddingVertical: 15,
  },
  onboardingButtonText: {
    color: "#f7f3ea",
    fontSize: 15,
    fontWeight: "900",
  },
};
