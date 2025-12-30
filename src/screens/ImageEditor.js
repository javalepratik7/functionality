import React, { useRef, useState } from "react";
import { 
  View, 
  Image, 
  Button, 
  StyleSheet, 
  Text, 
  Alert, 
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
  PermissionsAndroid,
  Modal,
  ScrollView
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Svg, { Path } from 'react-native-svg';
import RNFS from 'react-native-fs';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageEditor = () => {
  const viewShotRef = useRef(null);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [strokeColor, setStrokeColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);

  // Convert points to SVG path data for smooth drawing
  const pointsToSvgPath = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    return path;
  };

  // Create pan responder for smooth drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt, gestureState) => {
      if (!selectedImage) {
        Alert.alert("No Image", "Please select an image first");
        return;
      }
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = [{ x: locationX, y: locationY }];
      setCurrentPath(newPath);
    },
    
    onPanResponderMove: (evt, gestureState) => {
      if (!selectedImage) return;
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
    },
    
    onPanResponderRelease: () => {
      if (currentPath.length > 2) {
        setPaths(prev => [...prev, { 
          points: [...currentPath], 
          color: strokeColor, 
          width: strokeWidth,
          pathData: pointsToSvgPath(currentPath),
          id: Date.now() + Math.random()
        }]);
      }
      setCurrentPath([]);
    }
  });

  // Simplified permission request
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ];

        // Only request storage permissions for older Android versions
        if (Platform.Version < 33) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
        } else {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        // Check if all required permissions are granted
        return Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Open camera to take photo
  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Camera permission is required");
        return;
      }

      const options = {
        mediaType: 'photo',
        quality: 1.0,
        maxWidth: 1024,
        maxHeight: 1024,
        saveToPhotos: false, // Set to false to avoid permission issues
        includeBase64: false,
      };

      launchCamera(options, (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.error) {
          console.log('Camera Error: ', response.error);
          Alert.alert("Error", "Failed to take photo: " + response.error);
        } else if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          setSelectedImage({ uri: imageUri });
          setPaths([]);
          setShowImageSourceModal(false);
        }
      });
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  // Pick image from gallery
  const pickImageFromGallery = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 1.0,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      };

      launchImageLibrary(options, (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.error) {
          console.log('ImagePicker Error: ', response.error);
          Alert.alert("Error", "Failed to pick image: " + response.error);
        } else if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          setSelectedImage({ uri: imageUri });
          setPaths([]);
          setShowImageSourceModal(false);
        }
      });
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Use sample image
  const useSampleImage = () => {
    setSelectedImage({ uri: 'https://picsum.photos/400/400' });
    setPaths([]);
    setShowImageSourceModal(false);
  };

  // Save final image with drawing
  const saveImage = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select an image first");
      return;
    }

    try {
      const uri = await captureRef(viewShotRef, { 
        format: "png", 
        quality: 1.0 
      });

      // For now, just show the URI without saving to file system
      console.log("Image captured:", uri);
      
      Alert.alert(
        "Success", 
        "Image captured successfully!\n\nThe image is saved in app cache.",
        [
          {
            text: "OK",
            style: "default"
          }
        ]
      );

    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save image: " + error.message);
    }
  };

  // Clear drawing
  const clearDrawing = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  // Undo last drawing
  const undoDrawing = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  // Color selection
  const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#000000", "#FFFFFF"];

  // Brush sizes
  const brushSizes = [2, 5, 8, 12];

  return (
    <View style={styles.container}>
      {/* Image Source Selection Modal */}
      <Modal
        visible={showImageSourceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageSourceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Text style={styles.modalButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButton} onPress={pickImageFromGallery}>
              <Text style={styles.modalButtonText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButton} onPress={useSampleImage}>
              <Text style={styles.modalButtonText}>🎨 Use Sample Image</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setShowImageSourceModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ViewShot 
        ref={viewShotRef} 
        style={styles.viewShot}
        options={{ format: "png", quality: 1.0 }}
      >
        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image
              source={selectedImage}
              style={styles.image}
              resizeMode="contain"
              onError={(error) => console.log('Image loading error:', error)}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>No Image Selected</Text>
              <TouchableOpacity 
                style={styles.selectImageButton}
                onPress={() => setShowImageSourceModal(true)}
              >
                <Text style={styles.selectImageButtonText}>Select Image</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {selectedImage && (
            <View 
              style={styles.drawingCanvas}
              {...panResponder.panHandlers}
            >
              <Svg style={styles.svg}>
                {paths.map((path) => (
                  <Path
                    key={path.id}
                    d={path.pathData}
                    stroke={path.color}
                    strokeWidth={path.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                
                {currentPath.length > 1 && (
                  <Path
                    d={pointsToSvgPath(currentPath)}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </View>
          )}
        </View>
      </ViewShot>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity 
          style={styles.changeImageButton}
          onPress={() => setShowImageSourceModal(true)}
        >
          <Text style={styles.changeImageButtonText}>
            {selectedImage ? 'Change Image' : 'Select Image'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Drawing Controls */}
      {selectedImage && (
        <View style={styles.controls}>
          {/* Color Picker */}
          <View style={styles.controlSection}>
            <Text style={styles.controlLabel}>Colors:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.colorsRow}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      strokeColor === color && styles.selectedColor
                    ]}
                    onPress={() => setStrokeColor(color)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Brush Size Picker */}
          <View style={styles.controlSection}>
            <Text style={styles.controlLabel}>Brush Size:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.brushesRow}>
                {brushSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.brushButton,
                      strokeWidth === size && styles.selectedBrush
                    ]}
                    onPress={() => setStrokeWidth(size)}
                  >
                    <View 
                      style={[
                        styles.brushPreview,
                        { 
                          width: size * 2, 
                          height: size * 2,
                          backgroundColor: strokeColor 
                        }
                      ]} 
                    />
                    <Text style={styles.brushSizeText}>{size}px</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <View style={styles.buttonContainer}>
              <Button 
                title="Undo" 
                onPress={undoDrawing} 
                color="#8E8E93" 
                disabled={paths.length === 0}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button 
                title="Clear All" 
                onPress={clearDrawing} 
                color="#FF3B30" 
                disabled={paths.length === 0 && currentPath.length === 0}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button 
                title="Save Image" 
                onPress={saveImage} 
                color="#007AFF" 
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Styles remain the same as previous version
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "black" 
  },
  viewShot: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: "black",
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  selectImageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectImageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  drawingCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  svg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  changeImageButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    backgroundColor: "white",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  controlSection: {
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  colorsRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColor: {
    borderColor: "#007AFF",
    transform: [{ scale: 1.1 }],
  },
  brushesRow: {
    flexDirection: "row",
    gap: 15,
    alignItems: 'center',
  },
  brushButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedBrush: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  brushPreview: {
    borderRadius: 20,
  },
  brushSizeText: {
    fontSize: 10,
    marginTop: 4,
    color: '#666',
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ImageEditor;