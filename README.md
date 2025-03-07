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

## Setup and Run

### Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   cd backend

2. Install Maven dependencies:
   mvn clean install

3. Start the Spring Boot application:
   mvn spring-boot:run

4. Open another terminal and navigate to the frontend directory:
   cd frontend

5. Install npm dependencies:
   npm install @wellbees/color-picker-input

6. Start the React application:
   npm start

7. Open http://localhost:3000 in your browser to view the application.

### Frontend

In the `frontend` directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

#### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

### Backend

In the `backend` directory, you can run:

#### `mvn spring-boot:run`

Runs the Spring Boot application.\
Open [http://localhost:8080](http://localhost:8080) to view it in your browser.