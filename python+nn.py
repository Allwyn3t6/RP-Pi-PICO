import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Activation
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

# Sample GSR values and corresponding labels (1 for stressed, 0 for relaxed)
gsr_values = np.array([1.2, 1.5, 2.0, 1.8, 1.3])
labels = np.array([0, 0, 1, 0, 0])

# Reshape the data for the neural network
X = gsr_values.reshape(-1, 1)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2, random_state=42)

# Standardize the data
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Build the neural network
model = Sequential()

# Input layer
model.add(Dense(units=32, input_dim=1))
model.add(Activation('relu'))

# Output layer
model.add(Dense(units=1))
model.add(Activation('sigmoid'))

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train the model
history = model.fit(X_train, y_train, epochs=50, batch_size=2, validation_data=(X_test, y_test), verbose=0)

# Make predictions on the test set
predictions = model.predict(X_test)

# Plot the GSR values, true labels, and predicted labels
plt.figure(figsize=(10, 6))

plt.scatter(X_test, y_test, color='blue', label='True Labels')
plt.scatter(X_test, predictions, color='red', label='Predicted Labels', marker='x')

plt.title('Neural Network Output for GSR Classification')
plt.xlabel('GSR Values')
plt.ylabel('Labels')
plt.legend()
plt.show()

# Plot the training and validation loss over epochs
plt.figure(figsize=(10, 6))

plt.plot(history.history['loss'], label='Training Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Training and Validation Loss over Epochs')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.legend()
plt.show()
