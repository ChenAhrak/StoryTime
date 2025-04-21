import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import {styles} from './Style/characters'; // סגנונות


// נתוני דמויות
const charactersData = [
  { id: 1, name: 'חתול', image: require('../assets/images/cat.png') },
  { id: 2, name: 'חד קרן', image: require('../assets/images/unicorn.png') },
  { id: 3, name: 'נמר', image: require('../assets/images/tiger.png') },
  { id: 4, name: 'קוף', image: require('../assets/images/monkey.png') },
  { id: 5, name: 'ילד גיבור', image: require('../assets/images/superhero.png') },
  { id: 6, name: 'כלב', image: require('../assets/images/dog.png') },
  { id: 7, name: 'פנדה', image: require('../assets/images/panda.png') },
  { id: 8, name: 'ילדה', image: require('../assets/images/girl.png') },
  { id: 9, name: 'ארנבת', image: require('../assets/images/rabbit.png') },
];

const colorsList = [
    '#FFB6C1', // ורוד פסטל (במקום אדום)
    '#ADD8E6', // כחול פסטל (במקום כחול)
    '#90EE90', // ירוק פסטל (במקום ירוק)
    '#FFFFE0', // צהוב פסטל (במקום צהוב)
    '#E6E6FA', // לבנדר (במקום ורוד מקורי)
    '#87CEEB', // תכלת (נשאר)
    '#D3D3D3', // אפור פסטל (במקום שחור)
    '#FFFFFF', // לבן (נשאר)
  ];

export default function Characters() {

  const router = useRouter();
    
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [showPicker, setShowPicker] = useState(false); // מציג/מסתיר את פלטת הצבעים

  const renderCharacter = ({ item }) => (
    <TouchableOpacity style={styles.characterButton}>
      <Image source={item.image} style={styles.characterImage} />
      <Text style={styles.characterName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderColorOption = (color) => (
    <TouchableOpacity
      style={[styles.colorOption, { backgroundColor: color }]}
      onPress={() => setSelectedColor(color)}
    />
  );

  return (
    
    <View style={[styles.container, { backgroundColor: selectedColor }]}>
      {/* כותרת */}
      <Text style={styles.title}>בחר דמות</Text>

      {/* כפתור לפתיחת פלטת הצבעים */}
      <TouchableOpacity
        style={styles.colorButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={styles.colorButtonText}>
          {showPicker ? "סגור פלטת צבעים 🎨" : "בחר צבע רקע 🎨"}
        </Text>
      </TouchableOpacity>

      {/* פלטת צבעים */}
      {showPicker && (
        <FlatList
          data={colorsList}
          renderItem={({ item }) => renderColorOption(item)}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          contentContainerStyle={styles.colorsList}
        />
      )}

      {/* רשימת דמויות */}
      <FlatList
        data={charactersData}
        renderItem={renderCharacter}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3} // פריסת 3 עמודות
        contentContainerStyle={styles.characterGrid}
      />

      {/* כפתור הבא */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('./subjects')}>
        <Text style={styles.buttonText}>הבא</Text>
      </TouchableOpacity>

    </View>
  );
}


