// toastConfig.tsx
import { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  toast: {
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 0,
    width: '90%',
  },
  text1: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'RobotoRegular',
  },
  text2: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'RobotoRegular',
  },
});

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.toast, { backgroundColor: '#039116' }]}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={[styles.toast, { backgroundColor: '#e91e63' }]}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.toast, { backgroundColor: '#2196F3' }]}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
  irrigation: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.toast, { backgroundColor: '#e0f7fa', minHeight: 90, paddingVertical: 18 }]}
      text1Style={[styles.text1, { color: '#039116' }]}
      text2Style={[styles.text2, { color: '#039116' }]}
    />
  ),
};

export default toastConfig;