import { Text, View, Image, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as Progress from 'react-native-progress';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { styles } from './Style/storyFromLibrary';
import AlertModal from './Components/AlertModal'; // ✅ IMPORT MODAL
import AsyncStorage from '@react-native-async-storage/async-storage';

const StoryFromLibrary = () => {
  const router = useRouter();
  const { storyId, childId } = useLocalSearchParams();
  const [story, setStory] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording,setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [highlightedWords, setHighlightedWords] = useState([]);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modalData, setModalData] = useState({ // ✅ MODAL STATE
    visible: false,
    message: '',
    emoji: '',
    type: 'success',
  });

  const [reportData, setReportData] = useState({
    storyId,
    userId: '', // TODO: Replace with actual logged-in parent ID
    childId: childId, // TODO: Replace with actual child ID
    startTime: new Date().toISOString(),
    totalParagraphs: 0,
    completedParagraphs: 0,
    totalErrors: 0,
    paragraphs: [],
    summary: {}
  });


  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`http://www.storytimetestsitetwo.somee.com/api/Story/GetStoryById/${storyId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unknown error');

        const fetchedParagraphs = Object.values(data.paragraphs || {});
        const fetchedImages = Object.values(data.imagesUrls || {});
        const userId = await AsyncStorage.getItem('userId');

        setStory(data);
        setParagraphs(fetchedParagraphs);
        setImages(fetchedImages);
        setReportData(prev => ({
          ...prev,
          userId,
          totalParagraphs: fetchedParagraphs.length,
          paragraphs: fetchedParagraphs.map((text, index) => ({
            paragraphIndex: index,
            text,
            problematicWords: [],
            attempts: 0,
            wasSuccessful: false
          }))
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (storyId) fetchStory();
  }, [storyId]);

  const goToNextParagraph = () => {
    if (currentIndex < paragraphs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setHighlightedWords([]);
      setHasFeedback(false);
    }
  };

  const goToPreviousParagraph = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setHighlightedWords([]);
      setHasFeedback(false);
    }
  };

  const getProgressColor = () => {
    const progress = (currentIndex + 1) / paragraphs.length;
    if (progress < 0.34) return '#E74C3C';
    if (progress < 0.67) return '#F39C12';
    return '#27AE60';
  };

  const getEncouragementEmoji = () => {
    const progress = (currentIndex + 1) / paragraphs.length;
    if (progress < 0.34) return '🚀';
    if (progress < 0.67) return '🌟';
    return '🏆';
  };

  const speakStory = () => {
    if (paragraphs[currentIndex]) {
      setIsSpeaking(true);
      Speech.speak(paragraphs[currentIndex], {
        language: 'he-IL',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const stopStory = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const speakWord = (word) => {
    Speech.speak(word, {
      language: 'he-IL',
      onDone: () => { },
      onStopped: () => { },
      onError: (err) => console.error('Speech error:', err),
    });
  };

  const record = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        isMeteringEnabled: false,
      });

      await recording.startAsync();
      setRecording(recording);
      setRecordingUri(null);
      setIsRecording(true);
      console.log('🎤 Recording started as .wav');
    } catch (err) {
      console.error('Recording error:', err);
      Alert.alert('Recording error', err.message || 'Unknown error');
    }
  };


  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingUri(uri);
      setIsRecording(false);
      const formData = new FormData();
      formData.append('text', paragraphs[currentIndex]);
      formData.append('audio', {
        uri,
        name: 'recording.wav',
        type: 'audio/wav',
      });

      setIsAnalyzing(true);
      const response = await fetch('https://storytime-fp9z.onrender.com/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();
      const wrongArr = json.result;
      const words = paragraphs[currentIndex].split(/\s+/);
      const problematicWords = words.filter((_, i) => wrongArr[i] === 1);

      setReportData(prev => ({
        ...prev,
        completedParagraphs: prev.completedParagraphs + 1,
        totalErrors: prev.totalErrors + problematicWords.length,
        paragraphs: prev.paragraphs.map(p =>
          p.paragraphIndex === currentIndex
            ? {
              ...p,
              problematicWords,
              attempts: 1,
              wasSuccessful: !wrongArr.includes(1)
            }
            : p
        )
      }));

      setHighlightedWords(words.map((word, i) => ({ text: word, isWrong: wrongArr[i] === 1 })));
      setHasFeedback(true);

      setModalData({
        visible: true,
        message: wrongArr.includes(1)
          ? 'היו כמה פספוסים בהגייה 🤏 תנסה שוב, אתה כמעט שם!'
          : 'בול פגיעה! הגית את הכל מושלם 💪✨',
        emoji: wrongArr.includes(1) ? '🧐' : '🌟',
        type: wrongArr.includes(1) ? 'error' : 'success',
      });

      if (!wrongArr.includes(1)) goToNextParagraph();
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('שגיאה', 'הייתה שגיאה בעיבוד ההקלטה');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRecording = () => {
    recording ? stopRecording() : record();
  };

  const handleEndStory = async () => {
    try {
      const finalReport = {
        ...reportData,
        endTime: new Date().toISOString(),
        summary: {
          feedbackType: reportData.totalErrors === 0 ? 'Excellent' : 'Needs Improvement',
          comment:
            reportData.totalErrors === 0
              ? 'בול פגיעה! הגית את הכל מושלם 💪✨'
              : 'היו כמה מילים קשות. המשך לתרגל ונשפר יחד!',
          emoji: reportData.totalErrors === 0 ? '🌟' : '🧐'
        }
      };

      const response = await fetch("http://www.storytimetestsitetwo.somee.com/api/ReadingSessionReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(finalReport)
      });

      if (!response.ok) throw new Error(await response.text());

      console.log("✅ Report sent successfully");
      router.push('/userProfile');
      // router.push({ pathname:'/allReports', params:{childId,userId: finalReport.userId} });

    } catch (err) {
      console.error("❌ Failed to send report:", err);
      Alert.alert("שגיאה", "שליחת הדוח נכשלה");
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#65558F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {images[currentIndex] && (
            <Image source={{ uri: images[currentIndex] }} style={styles.image} resizeMode="cover" />
          )}

          {paragraphs[currentIndex] && (
            <View style={styles.wordWrapContainer}>
              {(highlightedWords.length > 0
                ? highlightedWords
                : paragraphs[currentIndex].split(/\s+/).map((word) => ({ text: word, isWrong: false }))
              ).map((wordObj, i) => (
                <TouchableOpacity key={i} onPress={() => speakWord(wordObj.text)}>
                  <Text
                    style={[
                      styles.wordText,
                      hasFeedback && {
                        color: wordObj.isWrong ? '#E74C3C' : '#2ECC71',
                      },
                    ]}
                  >
                    {wordObj.text + ' '}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.navigation}>
            <TouchableOpacity onPress={goToPreviousParagraph} disabled={isRecording ||currentIndex === 0}>
              <Icon name="arrow-right" size={30} color={isRecording || currentIndex === 0 ? '#ccc' : '#65558F'} />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>פסקה {currentIndex + 1} מתוך {paragraphs.length}</Text>
              <View style={styles.progressRow}>
                <Progress.Bar
                  progress={(currentIndex + 1) / paragraphs.length}
                  width={160}
                  height={10}
                  borderRadius={8}
                  color={getProgressColor()}
                  unfilledColor="#E0E0E0"
                  borderWidth={0}
                  animated
                  style={{ transform: [{ scaleX: -1 }] }}
                />
                <Text style={styles.emoji}>{getEncouragementEmoji()}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={goToNextParagraph} disabled={isRecording || currentIndex === paragraphs.length - 1}>
              <Icon name="arrow-left" size={30} color={isRecording || currentIndex === paragraphs.length - 1 ? '#ccc' : '#65558F'} />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.button, isSpeaking && styles.buttonListening]}
                onPress={isSpeaking ? stopStory : speakStory} disabled={isRecording}
              >
                <Icon name={isSpeaking ? "stop" : "volume-up"} size={30} color={isSpeaking ? "#C0392B" : "#65558F"} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, recording && styles.buttonListening]}
                onPress={toggleRecording} disabled={isSpeaking}
              >
                <Icon name={recording ? "stop" : "microphone"} size={30} color={recording ? "#C0392B" : "#65558F"} />
              </TouchableOpacity>
            </View>

            {currentIndex === paragraphs.length - 1 && (
              <TouchableOpacity
                onPress={() => {
                  handleEndStory();
                  router.push('/userProfile')
                }
              }
              disabled={isRecording}
                style={[styles.endButton, { marginTop: 20 }]}
              >
                <Text style={styles.endButtonText}>סיים את הסיפור</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* ✅ CUSTOM ALERT MODAL BELOW SCROLLVIEW */}
      <AlertModal
        visible={modalData.visible}
        onClose={() => setModalData(prev => ({ ...prev, visible: false }))}
        message={modalData.message}
        emoji={modalData.emoji}
        type={modalData.type}
      />
      {isAnalyzing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#65558F" />
          <Text style={styles.loadingText}>בודק את ההגייה שלך...</Text>
        </View>
      )}

    </View>
  );
};

export default StoryFromLibrary;
