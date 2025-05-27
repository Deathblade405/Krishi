
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import * as Speech from 'expo-speech';
import axios from 'axios';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [useGoogleTTS, setUseGoogleTTS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [recording, setRecording] = useState(null);
  const lottieRef = useRef();
  

  const sendMessage = async (textToSend = input) => {
    if (!textToSend.trim()) return;

    const userMessage = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await axios.post('http://192.168.3.129:8000/query', { text : textToSend });
      const botReply = res.data.response;
      const botMessage = { sender: 'bot', text: botReply };
      setMessages(prev => [...prev, botMessage]);

      if (voiceEnabled) {
        if (useGoogleTTS) {
          console.log("Using Google TTS (To be implemented)");
        } else {
          Speech.speak(botReply, {
            language: 'en',
            rate: 1.0,
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { sender: 'bot', text: 'Something went wrong. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recorded file available at:', uri);

      const transcribedText = await transcribeAudio(uri);
      setInput(transcribedText);
      sendMessage(transcribedText);
    } catch (error) {
      console.error('Transcription error:', error);
      setInput('Could not transcribe the audio.');
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const bgImage = darkTheme
    ? require('./assets/black.jpg')
    : require('./assets/white.jpg');

  return (
    <ImageBackground source={bgImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Image source={require('./assets/krishi.jpg')} style={styles.logo} />
          <Text style={styles.title}>Krishi Mitra</Text>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Voice</Text>
          <Switch
            value={voiceEnabled}
            onValueChange={() => setVoiceEnabled(prev => !prev)}
            thumbColor={voiceEnabled ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
          />
          <Text style={[styles.toggleLabel, { marginLeft: 20 }]}>Dark</Text>
          <Switch
            value={darkTheme}
            onValueChange={() => setDarkTheme(prev => !prev)}
            thumbColor={darkTheme ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#388e3c' }}
          />
{/* 
          <Switch
            value={useGoogleTTS}
            onValueChange={() => setUseGoogleTTS(prev => !prev)}
            thumbColor={useGoogleTTS ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#1e88e5' }}
          /> */}
        </View>

        <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 80 }}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.message,
                msg.sender === 'user' ? styles.userMsg : styles.botMsg,
              ]}
            >
              <View style={msg.sender === 'user' ? styles.tailRight : styles.tailLeft} />
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}

          {loading && (
            <View style={styles.typing}>
              <LottieView
                ref={lottieRef}
                source={require('./assets/typing.json')}
                autoPlay
                loop
                style={{ width: 60, height: 60 }}
              />
              <Text style={styles.typingText}>Typing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.voiceBtn} onPress={toggleRecording}>
            <Image
              source={require('./assets/mic.png')}
              style={{ width: 26, height: 26, tintColor: recording ? 'red' : 'green' }}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about a scheme..."
            placeholderTextColor="#1A5319"
          />
          <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// ✅ Real transcription logic with AssemblyAI
const transcribeAudio = async (uri) => {
  try {
    const apiKey = '51329d9916ce4771b99ad6e228f9ee2c'; // Replace with your AssemblyAI key

    const audio = {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    };

    const formData = new FormData();
    formData.append('file', audio);

    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey,
      },
      body: audio,
    });

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;

    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    // Polling for completion
    while (true) {
      const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: apiKey },
      });
      const pollingData = await pollingRes.json();

      if (pollingData.status === 'completed') {
        return pollingData.text;
      } else if (pollingData.status === 'error') {
        throw new Error('Transcription failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error('AssemblyAI Transcription Error:', err);
    throw err;
  }
};

const styles = StyleSheet.create({
  background: { 
    flex: 1,
    backgroundColor: '#80AF81' // Medium-light green background
  },
  container: { 
    flex: 1,
    backgroundColor: 'transparent' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: "#1A5319", // Darkest green for header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logo: { 
    width: 42, 
    height: 42, 
    marginRight: 14, 
    borderRadius: 10,
  },
  title: {
    fontSize: 22,
    color: '#D6EFD8', // Lightest green for text
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  toggleLabel: { 
    fontSize: 14, 
    color: 'darkgreen', 
    fontWeight: '600',
    marginRight: 8
  },
  chatArea: { 
    flex: 1, 
    paddingHorizontal: 16,
  },
  message: {
    maxWidth: '80%',
    padding: 16,
    marginVertical: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    position: 'relative',
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: 'green', // Lightest green for user messages
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  botMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#80AF81', // Medium-light green for bot messages
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
  },
  tailRight: {
    position: 'absolute',
    right: -8,
    bottom: 0,
    width: 16,
    height: 16,
    backgroundColor: 'green',
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 4,
    zIndex: -1,
  },
  tailLeft: {
    position: 'absolute',
    left: -8,
    bottom: 0,
    width: 16,
    height: 16,
    backgroundColor: '#80AF81',
    transform: [{ rotate: '45deg' }],
    borderBottomLeftRadius: 4,
    zIndex: -1,
  },
  messageText: { 
    fontSize: 16, 
    color: '#ffffff', // White text for readability
    lineHeight: 22,
    letterSpacing: 0.2
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#D6EFD8',
    alignSelf: 'flex-start',
    borderRadius: 18,
  },
  typingText: {
    fontSize: 14,
    color: '#1A5319',
    marginLeft: 10,
    fontStyle: 'italic'
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white', // Darkest green for input area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderTopWidth: 1,
    borderColor: 'lightgrey',
  
  },
  voiceBtn: { 
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'lightgrey',
    fontSize: 16,
    color: 'black',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'green', // Lightest green
    borderRadius: 22,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  
  },
  sendBtnText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2
  },
});
