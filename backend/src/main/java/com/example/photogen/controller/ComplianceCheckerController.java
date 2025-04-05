package com.example.photogen.controller;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.util.ArrayList;
import java.util.Map;

import org.opencv.core.Core;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfRect;
import org.opencv.core.Rect;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.objdetect.CascadeClassifier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/compliance-checker")
public class ComplianceCheckerController {
    
    static {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
    }

    private boolean isInFaceRegion(int x, int y, Rect faceRect) {
        return x >= faceRect.x && x <= faceRect.x + faceRect.width &&
               y >= faceRect.y && y <= faceRect.y + faceRect.height;
    }

    @PostMapping("/checks")
    public ResponseEntity<?> isIdPhotoCompliant(@RequestBody Map<String, String> payload) {

        ArrayList<String> errors = new ArrayList<>();

        String imageData = payload.get("image").split(",")[1];
        byte[] inputImageBytes = java.util.Base64.getDecoder().decode(imageData);
        Mat matImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);

        if (!isBackgroundWhite(matImage)) {
            errors.add("Background colour is not white.");
        }
        if (!isFaceCentered(matImage)) {
            errors.add("Face is not centered in the image.");
        }        
        if (!isSizeCompliant(matImage)) {
            errors.add("Image size is not a typical ID/passport photo size.");
        }

        return ResponseEntity.ok(Map.of(
            "compliant", errors.isEmpty(),
            "errors", errors
        ));
    }

    public boolean isSizeCompliant(Mat image) {
        double width = image.width();
        double height = image.height();

        return height / width >= 1.0 && height / width <= 1.45;
    }

    public boolean isFaceCentered(Mat image) {
        CascadeClassifier faceDetector = new CascadeClassifier(getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));

        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(image, faceDetections);

        if (faceDetections.toArray().length == 0) {
            return false;
        }

        Rect faceRect = faceDetections.toArray()[0];
        for (Rect rect : faceDetections.toArray()) {
            if (rect.area() > faceRect.area()) {
                faceRect = rect;
            }
        }

        int imageCenterX = image.width() / 2;
        int faceCenterX = faceRect.x + faceRect.width / 2;

        int tolerance = (int) (image.width() * 0.1);
        return Math.abs(imageCenterX - faceCenterX) <= tolerance;
    }

    public boolean isBackgroundWhite(Mat image){
        CascadeClassifier faceDetector = new CascadeClassifier(getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
        int width = image.width();
        int height = image.height();

        // 1. Detect Face
        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(image, faceDetections);
        Rect faceRect = null;
        if (faceDetections.toArray().length > 0) {
            faceRect = faceDetections.toArray()[0];
        }

        int sampleRate = 2;
        int totalBackgroundPixels = 0;
        int nonWhiteBackgroundPixels = 0;

        BufferedImage bufferedImage = matToBufferedImage(image);

        // 3. Refined ROI and Sampling
        for (int y = 0; y < height; y += sampleRate) {
            for (int x = 0; x < width; x += sampleRate) {
                if (faceRect == null || !isInFaceRegion(x, y, faceRect)) {
                    byte[] pixelData = ((DataBufferByte) bufferedImage.getRaster().getDataBuffer()).getData();
                    int index = (y * width + x) * 3;
                    int blue = pixelData[index] & 0xFF;
                    int green = pixelData[index + 1] & 0xFF;
                    int red = pixelData[index + 2] & 0xFF;
    
                    totalBackgroundPixels++;
    
                    if (!(red >= 230 && red <= 255 && green >= 230 && green <= 255 && blue >= 230 && blue <= 255)) {
                        nonWhiteBackgroundPixels++;
                    }
                }
            }
        }

        double nonWhitePercentage = (double) nonWhiteBackgroundPixels / totalBackgroundPixels * 100;
        double maxNonWhitePercentage = 50;

        return nonWhitePercentage <= maxNonWhitePercentage;
    }

    private BufferedImage matToBufferedImage(Mat mat) {
        int type = BufferedImage.TYPE_3BYTE_BGR;
        if (mat.channels() == 1) {
            type = BufferedImage.TYPE_BYTE_GRAY;
        }
        BufferedImage image = new BufferedImage(mat.width(), mat.height(), type);
        byte[] data = new byte[mat.width() * mat.height() * (int) mat.elemSize()];
        mat.get(0, 0, data);
        image.getRaster().setDataElements(0, 0, mat.width(), mat.height(), data);
        return image;
    }

}
