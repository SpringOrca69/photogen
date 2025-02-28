# Photogen

This project is a web application built with React for the frontend and Spring Boot for the backend. It allows users to upload images, crop and resize them, remove backgrounds, and edit T-shirts.

## Project Structure

The project is divided into two main parts:

- `frontend`: Contains the React application.
- `backend`: Contains the Spring Boot application.

## To run the application, follow these steps:

1. Open a terminal and navigate to the `backend` directory:
   cd backend

2. Start the Spring Boot application:
   mvn spring-boot:run

3. Open another terminal and navigate to the frontend directory:
   cd frontend

4. Start the React application:
   npm start

5. Open http://localhost:3000 in your browser to view the application.

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



