package com.example.photogen.controller;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfRect;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/background-removal")
public class BackgroundRemovalController {

    private static final Logger logger = LoggerFactory.getLogger(BackgroundRemovalController.class);

    static {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
    }

    @PostMapping("/remove")
    public ResponseEntity<?> removeBackground(@RequestBody Map<String, String> payload) {
        try {
            String backgroundColour = payload.get("backgroundColour");

            String imageData = payload.get("image").split(",")[1];
            byte[] inputImageBytes = java.util.Base64.getDecoder().decode(imageData);
            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            
            Mat customBackground;
            if (payload.get("customBackground") != null) {
                String backgroundData = payload.get("customBackground").split(",")[1];
                byte[] backgroundImageBytes = java.util.Base64.getDecoder().decode(backgroundData);
                customBackground = Imgcodecs.imdecode(new MatOfByte(backgroundImageBytes), Imgcodecs.IMREAD_COLOR);
            } 
            else {
                customBackground = null;
            }

            String dataUrl = processUserDrawing(inputImage, customBackground, backgroundColour);
    
            return ResponseEntity.ok(Map.of(
                "processedImageDataUrl", dataUrl, // Return the data URL
                "message", "Background removed successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Face detection failed: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Processing failed: " + e.getMessage()));
        }
    }

    private String processUserDrawing(Mat drawnImage, Mat customBackground, String backgroundColour) {
        if (drawnImage.empty()) {
            throw new IllegalArgumentException("Empty image");
        }

        if (customBackground != null && customBackground.empty()) {
            throw new IllegalArgumentException("Empty custom background image");
        }

        // Create a new Mat object to store the result depending on whether a custom background is provided
        Mat result;
        if (customBackground != null) {
            Mat resizedBackground = resizeImage(customBackground, drawnImage.width(), drawnImage.height());

            if (resizedBackground.width() != drawnImage.width() || resizedBackground.height() != drawnImage.height()) {
                throw new IllegalArgumentException("Custom background image size does not match original image size");
            }

            result = resizedBackground.clone();
        }
        else {
            result = new Mat(drawnImage.size(), drawnImage.type(), parseColor(backgroundColour));
        }

        CascadeClassifier faceDetector = new CascadeClassifier(getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(drawnImage, faceDetections);
        
        if (faceDetections.empty()) {
            throw new IllegalArgumentException("No faces detected");
        }

        Rect faceRect = faceDetections.toArray()[0];
        for (Rect rect : faceDetections.toArray()) {
            if (rect.area() > faceRect.area()) {
                faceRect = rect;
            }
        }

        Mat faceImage = drawnImage.clone();
        Mat faceImageClone = faceImage.clone();
        Mat formalImage = Imgcodecs.imread("src/main/resources/images/formal2.png");
        if (formalImage.empty()) {
            throw new IllegalArgumentException("Formal image not found");
        }
        
        if (faceRect.height < 0.6 * drawnImage.height()) {
            Rect expandedFaceRect = expandFaceRegion(faceRect, drawnImage.size(), 2.4, 1.3);
            Rect clothesRect = clothesRegion(faceRect, drawnImage.size());
            Mat clothesImage = drawnImage.clone();
            Mat clothesImageClone = clothesImage.clone();
            
            Mat faceForegroundMask = grabCut(faceImage, expandedFaceRect);
            faceImageClone.copyTo(result, faceForegroundMask);
            
            //Mat clothesForegroundMask = grabCut(clothesImage, clothesRect);
            //clothesImageClone.copyTo(result, clothesForegroundMask);

            Mat formalImageResized = resizeImage(formalImage, drawnImage.width(), drawnImage.height());
            Mat formalImageClone = formalImageResized.clone();
            Rect formalClothesRect = new Rect(0, formalImageResized.height() / 2, formalImageResized.width(), formalImageResized.height() / 2);
            Mat formalForegroundMask = grabCut(formalImageResized, formalClothesRect);

            ImmutablePair<Mat, Mat> stretchedAndCropped = stretchAndCropHorizontally(formalImageClone, formalForegroundMask, 1.5);
            formalImageClone = stretchedAndCropped.getLeft();
            formalForegroundMask = stretchedAndCropped.getRight();

            double largestGap = findLargestGap(faceForegroundMask, formalForegroundMask) * 0.6;
            Mat formalImageTranslated = shiftDown(formalImageClone, largestGap);
            Mat formalForegroundMaskTranslated = shiftDown(formalForegroundMask, largestGap);
            formalImageTranslated.copyTo(result, formalForegroundMaskTranslated);
        } 
        else {
            Rect expandedFaceRect = expandFaceRegion(faceRect, drawnImage.size(), 1.7, 1.2);
            Mat faceForegroundMask = grabCut(faceImage, expandedFaceRect);
            faceImageClone.copyTo(result, faceForegroundMask);
        }

        String uniqueFileName = UUID.randomUUID().toString() + ".jpg";
        String outputPath = "src/main/resources/processed/" + uniqueFileName;
        Imgcodecs.imwrite(outputPath, result);
        logger.info("Image saved at: " + outputPath);

        MatOfByte matOfByte = new MatOfByte();
        Imgcodecs.imencode(".jpg", result, matOfByte);
        byte[] byteArray = matOfByte.toArray();
        String base64Image = Base64.getEncoder().encodeToString(byteArray);

        String dataUrl = "data:image/jpeg;base64," + base64Image;

        return dataUrl;
    }

    private Rect expandFaceRegion(Rect faceRect, Size imageSize, double verticalExpansion, double horizontalExpansion) {
        // Expand both horizontally and vertically
        int newWidth = (int) (faceRect.width * horizontalExpansion);
        int newX = Math.max(0, faceRect.x - (newWidth - faceRect.width) / 2) + 5;
        newWidth = Math.min(newWidth, (int) (imageSize.width - newX)) - 10;
    
        int newHeight = (int) (faceRect.height * verticalExpansion);
        int newY = Math.max(0, faceRect.y + faceRect.height / 2 - newHeight / 2) + 5;
        newHeight = Math.min(newHeight, (int) (imageSize.height - newY)) - 10;
    
        return new Rect(newX, newY, newWidth, newHeight);
    }

    private Rect clothesRegion(Rect faceRect, Size imageSize) {
        // Expand both horizontally and vertically
        double horizontalExpansion = 2.7;

        int newWidth = (int) (faceRect.width * horizontalExpansion);
        int newX = Math.max(0, faceRect.x - (newWidth - faceRect.width) / 2);
        newWidth = Math.min(newWidth, (int) (imageSize.width - newX));
        newWidth = Math.max(newWidth, 0);
    
        int newY = faceRect.y + faceRect.height - 10;
        int newHeight = (int) (imageSize.height - newY);
        newHeight = Math.max(newHeight, 0);
    
        return new Rect(newX, newY, newWidth, newHeight);
    }

    private Scalar parseColor(String colorString) {
        if (colorString.startsWith("#")) {
            // Handle hex color code
            String hex = colorString.substring(1); // Remove the #
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            return new Scalar(b, g, r); // OpenCV uses BGR order
        } else {
            // Handle comma-separated format
            String[] rgb = colorString.split(",");
            return new Scalar(Double.parseDouble(rgb[2]), Double.parseDouble(rgb[1]), Double.parseDouble(rgb[0]));
        }
    }
    

    private Mat grabCut(Mat image, Rect rect) {
        Mat mask = new Mat(image.size(), CvType.CV_8UC1, new Scalar(Imgproc.GC_BGD));
        Imgproc.rectangle(mask, rect.tl(), rect.br(), new Scalar(Imgproc.GC_PR_FGD), -1);

        Mat imageClone = image.clone();
        Imgproc.rectangle(imageClone, rect.tl(), rect.br(), new Scalar(0, 255, 0), 3);
    
        Mat bgdModel = new Mat();
        Mat fgdModel = new Mat();
        int grabCutIterations = 50;
    
        Imgproc.grabCut(image, mask, rect, bgdModel, fgdModel, grabCutIterations, Imgproc.GC_INIT_WITH_MASK | Imgproc.GC_INIT_WITH_RECT);
    
        Mat foregroundMask = new Mat(mask.size(), CvType.CV_8UC1, new Scalar(0));
        Core.compare(mask, new Scalar(Imgproc.GC_PR_FGD), foregroundMask, Core.CMP_EQ);
    
        Mat fgdMask = new Mat(mask.size(), CvType.CV_8UC1, new Scalar(0));
        Core.compare(mask, new Scalar(Imgproc.GC_FGD), fgdMask, Core.CMP_EQ);
    
        Core.bitwise_or(foregroundMask, fgdMask, foregroundMask);

        int iterations = 3;
        int size = 3;
        for (int i = 0; i < iterations; i++) {
            Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(size + i * 2, size + i * 2));
            Imgproc.morphologyEx(foregroundMask, foregroundMask, Imgproc.MORPH_CLOSE, kernel);
        }

        return foregroundMask;
    }

    private Mat shiftDown(Mat inputMat, double shiftY) {
        // Create the translation matrix
        Mat translationMatrix = new Mat(2, 3, CvType.CV_32F);
        translationMatrix.put(0, 0, 1, 0, 0); // tx = 0
        translationMatrix.put(1, 0, 0, 1, shiftY); // ty = shiftY

        // Calculate the new image size
        Size newSize = new Size(inputMat.cols(), inputMat.rows());

        // Apply warpAffine
        Mat outputMat = new Mat();
        Imgproc.warpAffine(inputMat, outputMat, translationMatrix, newSize);

        return outputMat;
    }

    private Mat resizeImage(Mat image, int width, int height) {
        Mat resizedImage = new Mat();
        Imgproc.resize(image, resizedImage, new Size(width, height), 0, 0, Imgproc.INTER_CUBIC);
        return resizedImage;
    }

    private int findLargestGap(Mat faceMask, Mat clothesMask){
        int largestGap = 0;
        
        for (int x = 0; x < faceMask.cols(); x++) {
            int gap;
            int highest = Integer.MAX_VALUE;
            int lowest = -1;

            for (int y = 0; y < clothesMask.rows(); y++) {
                if (clothesMask.get(y, x)[0] == 255 && y < highest) {
                    highest = y;
                }
            }

            for (int y = faceMask.rows() - 1; y >= 0; y--) {
                if (faceMask.get(y, x)[0] == 255 && y > lowest) {
                    lowest = y;
                }
            }

            if (highest == 0 || lowest == 0) {
                continue;
            }

            gap = lowest - highest;
            if (gap > largestGap) {
                largestGap = gap;
            }
        }

        return largestGap;
    }

    private ImmutablePair<Mat, Mat> stretchAndCropHorizontally(Mat image, Mat mask, double horizontalScale) {
        int newWidth = (int) (image.cols() * horizontalScale);
        Size newSize = new Size(newWidth, image.rows());

        Mat resizedImage = new Mat();
        Mat resizedMask = new Mat();
        Imgproc.resize(image, resizedImage, newSize);
        Imgproc.resize(mask, resizedMask, newSize);

        int offsetX = (newWidth - image.cols()) / 2;

        Rect cropRect = new Rect(offsetX, 0, image.cols(), image.rows());
        Mat croppedImage = resizedImage.submat(cropRect).clone();
        Mat croppedMask = resizedMask.submat(cropRect).clone();

        return new ImmutablePair<>(croppedImage, croppedMask);
    }
}