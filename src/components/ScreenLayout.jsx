import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStyles } from '../theme/ThemeProvider';

export default function ScreenLayout({ title, subtitle, children, scrollTopKey }) {
  const { colors, styles, shared } = useThemeStyles(createStyles);
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollTopKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollTopKey]);
  return <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        ref={scrollRef} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.topline}>
          <View style={styles.brandDot} />
            <Text style={styles.brand}>
              FITTRACK 
              <Text style={styles.brandLight}> / WELLNESS STUDIO
              </Text>
            </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const createStyles = (colors, shared) => StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  scroll: { 
    paddingHorizontal: 20, 
    paddingTop: 18, 
    paddingBottom: 45 
  },
  topline: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 22 
  },
  brandDot: { 
    width: 9, 
    height: 9, 
    backgroundColor: colors.primary, 
    borderRadius: 3 
  },
  brand: { 
    color: colors.primary, 
    fontSize: 12, 
    fontWeight: '900', 
    letterSpacing: 1.5 
  },
  brandLight: { 
    color: colors.muted, 
    fontWeight: '500', 
    letterSpacing: 1 
  },
  title: { 
    fontSize: 30, 
    fontWeight: '900', 
    color: colors.text, 
    letterSpacing: -0.9 
  },
  subtitle: { 
    color: colors.muted, 
    marginTop: 7, 
    fontSize: 13, 
    lineHeight: 20 
  },
  content: { 
    marginTop: 21 
  },
});
