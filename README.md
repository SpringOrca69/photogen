# Photogen

This project is a web application built with React for the frontend and Spring Boot for the backend. It allows users to upload images, crop and resize them, remove and replace backgrounds, and edit T-shirts.

## Project Structure

The project is divided into two main parts:

- `frontend`: Contains the React application.
- `backend`: Contains the Spring Boot application.

## Prerequisites

Before running the application, make sure you have the following installed:

### For Backend
- Java JDK 21 or later
- Maven 3.9+ 

### For Frontend
- Node.js 16.x or later
- npm 8.x or later

## Installation

### Installing Java
1. Download and install Java JDK 21+ from [Oracle](https://www.oracle.com/java/technologies/downloads/)
2. Set JAVA_HOME environment variable to point to your Java installation
3. Verify installation: type "java --version" into your command prompt

### Installing Maven
1. Download Maven from [Apache Maven website](https://maven.apache.org/download.cgi)
2. Extract it to a directory of your choice
3. Add the `bin` directory to your PATH environment variable
4. Verify installation: type "mvn --version" into your command prompt

### Installing Node.js and npm
1. Download and install Node.js from [Node.js website](https://nodejs.org/)
2. The installation includes npm (Node Package Manager)
3. Verify installation: type "node --version" into your command prompt

### Installing OpenCV (Required for Backend)
1. Download OpenCV from [OpenCV website](https://opencv.org/releases/)
   - For Java JDK 21 or below, choose OpenCV 4.8.0
   - For newer versions, select the appropriate compatible release

2. Install OpenCV to a location on your computer (e.g., D:\opencv or C:\opencv)

3a. For Windows:
   - Copy the native library file from your OpenCV installation to your JDK bin folder
   - Example: Copy `D:\opencv\build\java\x64\opencv_java480.dll` to `C:\Program Files\Java\jdk-21\bin`
   
3b. For Mac:
   - Copy the native library file to your JDK bin folder
   - Example: Copy `libopencv_java480.dylib` to your JDK bin folder
   
4. Put the jar file onto the system environment path

## Run Application

1. Open a terminal and navigate to the `backend` directory:
   cd backend

2. Install Maven dependencies:
   mvn clean install

3. Start the Spring Boot application:
   mvn spring-boot:run

4. Open another terminal and navigate to the frontend directory:
   cd frontend

5. Install npm dependencies:
   npm install @wellbees/color-picker-input jszip file-saver

6. Start the React application:
   npm start

7. Open http://localhost:3000 in your browser to view the application.