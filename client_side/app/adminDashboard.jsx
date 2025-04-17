import React, { useContext, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, StyleSheet, ScrollView, Platform
} from 'react-native';
import { UserContext } from './Context/userContextProvider'; // נניח שפה מאוחסן הסטייט
import DateTimePicker from '@react-native-community/datetimepicker';
import { use } from 'react';


export default function AdminDashboard() {
  const { users, DeleteUser, EditUser } = useContext(UserContext);
  const [editingUser, setEditingUser] = useState(null);
  const [updatedUserData, setUpdatedUserData] = useState({});
  const [showDatePickerIndex, setShowDatePickerIndex] = useState(null);
  console.log(users);

  // מסננים את הנתונים של המשתמש לפני שליחה לשרת
  const prepareUserForUpdate = (user) => {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      parentDetails: (user.parentDetails || []).map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        phoneNumber: p.phoneNumber,
      })),
      children: (user.children || []).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        birthdate: new Date(c.birthdate).toISOString(),
        readingLevel: c.readingLevel,
        readingHistory: (c.readingHistory || [])
          .filter((r) => r.storyId && r.readDate)
          .map((r) => ({
            id: r.id,
            storyId: r.storyId,
            feedbackID: r.feedbackID || null,
            readDate: new Date(r.readDate).toISOString(),
          })),
      })),
    };
  };

  // פותח את טופס העריכה עם הנתונים של המשתמש הנבחר
  // ומעדכן את הסטייט
  const handleEdit = (user) => {
    setEditingUser(user);
    setUpdatedUserData({
      ...user,
      username: user.username || '',
      email: user.email || '',
      password: user.password || '',
      parentDetails: user.parentDetails || [],
      children: user.children || [],

    });
  };

  // שומר את השינויים
  // ומעדכן את הסטייט
  const handleSave = () => {
    const cleanUser = prepareUserForUpdate(updatedUserData);
    console.log('Final payload:', JSON.stringify(cleanUser, null, 2));
    EditUser(cleanUser);
    setEditingUser(null);
  };


  const renderUser = ({ item }) => {
    // if (item.username?.toLowerCase() === 'admin') return null;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.username}</Text>
        <Text>אימייל: {item.email || 'לא צויין'}</Text>

        <Text style={styles.section}>👨‍👩‍👧 פרטי הורים:</Text>
        {item.parentDetails?.map((parent, index) => (
          <Text key={index}>- {parent.firstName} {parent.lastName}, {parent.phoneNumber}</Text>
        ))}

        <Text style={styles.section}>👶 ילדים:</Text>
        {item.children?.map((child, index) => (
          <Text key={index}>- {child.firstName}, רמה: {child.readingLevel}</Text>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
            <Text style={styles.btnText}>ערוך</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => DeleteUser(item.id)} style={styles.deleteBtn}>
            <Text style={styles.btnText}>מחק</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>משתמשים רשומים</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListEmptyComponent={<Text>לא נמצאו משתמשים</Text>}
      />

      {/* טופס עריכה */}
      <Modal visible={!!editingUser} animationType="slide">
        <ScrollView style={styles.modalContent}>
          <Text style={styles.header}>עריכת משתמש</Text>
          <TextInput
            style={styles.input}
            placeholder="שם משתמש"
            value={updatedUserData.username}
            onChangeText={(text) => setUpdatedUserData({ ...updatedUserData, username: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="אימייל"
            value={updatedUserData.email}
            onChangeText={(text) => setUpdatedUserData({ ...updatedUserData, email: text })}
          />
          <Text style={styles.section}>👨‍👩‍👧 עריכת פרטי הורים:</Text>
          {updatedUserData.parentDetails?.map((parent, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="שם פרטי"
                value={parent.firstName}
                onChangeText={(text) => {
                  const updated = [...updatedUserData.parentDetails];
                  updated[index].firstName = text;
                  setUpdatedUserData({ ...updatedUserData, parentDetails: updated });
                }}
              />
              <TextInput
                style={styles.input}
                placeholder="שם משפחה"
                value={parent.lastName}
                onChangeText={(text) => {
                  const updated = [...updatedUserData.parentDetails];
                  updated[index].lastName = text;
                  setUpdatedUserData({ ...updatedUserData, parentDetails: updated });
                }}
              />
              <TextInput
                style={styles.input}
                placeholder="טלפון"
                value={parent.phoneNumber}
                onChangeText={(text) => {
                  const updated = [...updatedUserData.parentDetails];
                  updated[index].phoneNumber = text;
                  setUpdatedUserData({ ...updatedUserData, parentDetails: updated });
                }}
              />
            </View>
          ))}

          <Text style={styles.section}>👶 עריכת פרטי ילדים:</Text>
          {updatedUserData.children?.map((child, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="שם פרטי"
                value={child.firstName}
                onChangeText={(text) => {
                  const updated = [...updatedUserData.children];
                  updated[index].firstName = text;
                  setUpdatedUserData({ ...updatedUserData, children: updated });
                }}
              />
              <TextInput
                style={styles.input}
                placeholder="רמת קריאה"
                keyboardType="numeric"
                value={child.readingLevel?.toString()}
                onChangeText={(text) => {
                  const updated = [...updatedUserData.children];
                  updated[index].readingLevel = parseInt(text) || 0;
                  setUpdatedUserData({ ...updatedUserData, children: updated });
                }}
              />

              {/* תאריך לידה - מותאם למובייל ו-Web */}
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.input}
                  placeholder="תאריך לידה"
                  value={
                    child.birthdate
                      ? new Date(child.birthdate).toISOString().split('T')[0]
                      : ''
                  }
                  onChangeText={(text) => {
                    const updated = [...updatedUserData.children];
                    updated[index].birthdate = new Date(text).toISOString();
                    setUpdatedUserData({ ...updatedUserData, children: updated });
                  }}
                  keyboardType="default"
                  type="date" // רק ב-Web עובד
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowDatePickerIndex(index)}
                    style={[styles.input, { justifyContent: 'center' }]}
                  >
                    <Text>
                      {child.birthdate
                        ? new Date(child.birthdate).toLocaleDateString('he-IL')
                        : 'בחר תאריך לידה'}
                    </Text>
                  </TouchableOpacity>

                  {showDatePickerIndex === index && (
                    <DateTimePicker
                      mode="date"
                      value={child.birthdate ? new Date(child.birthdate) : new Date()}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          const updated = [...updatedUserData.Children];
                          updated[index].birthdate = selectedDate.toISOString();
                          setUpdatedUserData({ ...updatedUserData, Children: updated });
                        }
                        setShowDatePickerIndex(null);
                      }}
                    />
                  )}
                </>
              )}
            </View>


          ))}


          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setEditingUser(null)} style={styles.cancelBtn}>
              <Text style={styles.btnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.btnText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    textAlign: 'center',
    marginVertical: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
  },
  section: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  editBtn: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 6,
    marginTop: 20,
    flex: 1,
    marginLeft: 5,
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 6,
    marginTop: 20,
    flex: 1,
    marginRight: 5,
  },
  btnText: {
    color: '#fff',
    textAlign: 'center',
  },
  modalContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});
