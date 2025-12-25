import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from "react-i18next";

// Change this to your computer's IP address for mobile testing
const API_BASE_URL = "http://192.168.18.226:8000"; 

interface CropYieldPredictionCardProps {
  style?: any;
}

const featureOrder = [
  "Year",
  "Area_harvested",
  "Avg_Temp_ANN",
  "Aqua_Water_Metric",
  "CropType_encoded",
];

const cropTypeOptions = [
  { label: "Wheat", value: 0 },
  { label: "Rice", value: 1 },
];

export const CropYieldPredictionCard: React.FC<CropYieldPredictionCardProps> = ({ style }) => {
  const { t } = useTranslation();
  type InputsType = Record<typeof featureOrder[number], string>;
  const [inputs, setInputs] = useState<InputsType>({
    Year: "",
    Area_harvested: "",
    Avg_Temp_ANN: "",
    Aqua_Water_Metric: "",
    CropType_encoded: "0", // Default to Wheat
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleChange = (name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateInputs = () => {
    for (const key of featureOrder) {
      if (!inputs[key] && key !== "CropType_encoded") return t(`cropYield.errors.enterField`, { field: t(`cropYield.fields.${key}`) });
      if (key !== "CropType_encoded" && isNaN(Number(inputs[key]))) return t(`cropYield.errors.mustBeNumber`, { field: t(`cropYield.fields.${key}`) });
    }
    return null;
  };

  const handlePredict = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = [
        Number(inputs.Year),
        Number(inputs.Area_harvested),
        Number(inputs.Avg_Temp_ANN),
        Number(inputs.Aqua_Water_Metric),
        Number(inputs.CropType_encoded),
      ];
  const response = await fetch(`${API_BASE_URL}/api/predict/yield`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: payload }),
      });
      const data = await response.json();
      if (response.ok && data?.predicted_yield !== undefined) {
        setResult(data.predicted_yield.toString());
      } else {
        setError(data?.detail || "Prediction failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{t("cropYield.title")}</Text>
      {/* Render numeric fields */}
      {featureOrder.slice(0, 4).map((key) => (
        <View key={key} style={styles.inputGroup}>
          <Text style={styles.label}>{t(`cropYield.fields.${key}`)}</Text>
          <TextInput
            style={styles.input}
            value={inputs[key]}
            onChangeText={(val) => handleChange(key, val)}
            keyboardType="numeric"
            placeholder={t("cropYield.placeholders.enterField", { field: t(`cropYield.fields.${key}`) })}
          />
        </View>
      ))}
      {/* Render crop type picker */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t(`cropYield.fields.CropType_encoded`)}</Text>
        <Picker
          selectedValue={inputs.CropType_encoded}
          style={{ height: 50, borderRadius: 8, backgroundColor: '#f9f9f9' }}
          onValueChange={(itemValue) => handleChange("CropType_encoded", String(itemValue))}
        >
          {cropTypeOptions.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={String(option.value)} />
          ))}
        </Picker>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handlePredict} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("cropYield.buttons.predictYield")}</Text>}
      </TouchableOpacity>
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>{t("cropYield.results.predictedCropYield")}</Text>
          <Text style={styles.resultValue}>{result}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#388e3c",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: "#1F2A44",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#388e3c",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  error: {
    color: "#d32f2f",
    marginBottom: 8,
    textAlign: "center",
  },
  resultBox: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 14,
    color: "#388e3c",
    marginBottom: 4,
    fontWeight: "bold",
  },
  resultValue: {
    fontSize: 22,
    color: "#388e3c",
    fontWeight: "bold",
  },
});

export default CropYieldPredictionCard;
