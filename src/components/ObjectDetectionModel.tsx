import React, { useEffect, useRef, useState } from "react";
import {
  DetectedObject,
  ObjectDetection,
  load as cocoModalLoad,
} from "@tensorflow-models/coco-ssd";
import { browser } from "@tensorflow/tfjs";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Input,
  Modal,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./styles/theme";
import { webStyle } from "./styles/webStyle";
import { EditObject, IdentifierObject } from "./types";

export function ObjectDetectionModel({
  imageLink = "",
  setObjectIdentifier,
  existedObjects,
  updateImage,
  deleteObject,
  readFromSource,
}: {
  imageLink: string;
  setObjectIdentifier: (identifier: IdentifierObject | null) => void;
  existedObjects?: EditObject[] | null;
  updateImage?: (arg: EditObject | null) => void;
  deleteObject?: (arg: EditObject | null) => void;
  readFromSource?: boolean;
}) {
  const imageEle = useRef<HTMLImageElement>(null);
  const canvasEle = useRef<HTMLCanvasElement | null>(null);
  const [objectDetector, setObjectDetectors] = useState<ObjectDetection | null>(
    null,
  );
  const [detectedObjects, setDetectedObjects] = useState<
    DetectedObject[] | undefined
  >([]);
  const [imageBase64, setImageBase64] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentEditIndex, setCurrentEditIndex] = useState<
    number | undefined
  >();
  const [showEditModal, setShowEditModal] = useState(false);

  const loadOCRModel = async () => {
    const model = await cocoModalLoad();
    setObjectDetectors(model);
  };

  const startDetecting = async () => {
    if (imageEle.current) {
      const image = browser.fromPixels(imageEle.current);
      const predictions = await objectDetector?.detect(image);

      setDetectedObjects(predictions);
    }
  };

  const draw = () => {
    const context = canvasEle?.current?.getContext("2d");
    const objects = detectedObjects;
    if (context && canvasEle.current && imageEle.current) {
      canvasEle.current.width = imageEle.current.width;
      canvasEle.current.height = imageEle.current.height;
      // Clear part of the canvas
      context.fillStyle = "#000000";
      context.fillRect(0, 0, imageEle.current.width, imageEle.current.height);

      context.drawImage(
        imageEle.current,
        0,
        0,
        imageEle.current.width,
        imageEle.current.height,
      );

      setImageBase64(canvasEle.current.toDataURL());

      if (objects?.length) {
        for (const targetObject of objects) {
          // Draw the background rectangle for text
          context.fillStyle = "rgba(0, 128, 0, 0.5)";
          context.strokeStyle = "white";
          context.fillRect(
            targetObject.bbox[0],
            targetObject.bbox[1],
            targetObject.bbox[2],
            20,
          );
          // Write image class on top left of rect
          context.font = "16px Arial";
          context.fillStyle = "white";
          context.fillText(
            targetObject.class,
            targetObject.bbox[0] + 4,
            targetObject.bbox[1] + 16,
          );

          // draw rectangle using data from prediction result
          context.beginPath();
          context.rect(
            targetObject.bbox[0],
            targetObject.bbox[1],
            targetObject.bbox[2],
            targetObject.bbox[3],
          );
          context.strokeStyle = "green";
          context.stroke();
          context.closePath();
        }
      }
    }
  };

  const convertFromSource = () =>
    existedObjects?.map((exObject): DetectedObject => {
      const {
        width: objectwidth,
        height: objectHeight,
        x: xCoord,
        y: yCoord,
        name: objectName,
        object_percentage: objectPercentage,
      } = exObject;
      return {
        bbox: [xCoord, yCoord, objectwidth, objectHeight],
        class: objectName,
        score: objectPercentage / 10,
      };
    });

  useEffect(() => {
    setTimeout(
      () =>
        readFromSource
          ? setDetectedObjects(convertFromSource())
          : loadOCRModel(),
      1600,
    );
  }, [imageLink]);

  useEffect(() => {
    objectDetector && startDetecting();
  }, [objectDetector]);

  useEffect(() => {
    detectedObjects && draw();
  }, [detectedObjects]);

  useEffect(() => {
    if (imageBase64) {
      const [imgHeight, imgWidth] = [
        imageEle.current?.height,
        imageEle.current?.width,
      ];
      const bxBlockObjects = detectedObjects?.map((bxObject) => ({
        name: bxObject.class,
        width: bxObject.bbox[2],
        height: bxObject.bbox[3],
        x: bxObject.bbox[0],
        y: bxObject.bbox[1],
        object_percentage: bxObject.score * 10,
      }));

      setObjectIdentifier({
        height: Number(imgHeight),
        width: Number(imgWidth),
        object_image: {
          data: imageBase64,
        },
        bx_block_objectidentifier2_objects_attributes: bxBlockObjects?.length
          ? bxBlockObjects
          : [],
      });
    }
  }, [imageBase64, detectedObjects]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          mt: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: 'center',
          gap: 2,
        }}
      >
        <img
          crossOrigin="anonymous"
          ref={imageEle}
          src={imageLink}
          alt="image link"
          style={{
            maxWidth: "30rem",
            objectFit: "contain",
            visibility: "hidden",
            position: "absolute",
          }}
        />
        <canvas
          data-test-id="canvasEl"
          ref={canvasEle}
          style={{
            maxWidth: "30rem",
            objectFit: "contain",
          }}
        />
        {!detectedObjects && showEditModal && (
          <CircularProgress
            style={{ display: "block", margin: "auto", padding: "10rem" }}
          />
        )}
        {Boolean(detectedObjects?.length) && (
          <Box sx={{ mt: 2, m: "auto" }}>
            <Typography variant="h6">Identified objects: </Typography>
            <Box sx={{ display: "flex", gridGap: "1rem", py: "0.5rem" }}>
              {detectedObjects?.map((imgObject, index) => {
                return (
                  <div key={imgObject.score}>
                    <Chip
                      data-test-id="chip-btn"
                      label={imgObject.class}
                      variant="outlined"
                      style={webStyle.chip}
                      onClick={() => {
                        setCurrentEditIndex(index);
                        setShowEditModal(true);
                      }}
                      onDelete={() => {
                        const resultDetectedObjects = [...detectedObjects];
                        resultDetectedObjects.splice(index, 1);
                        setDetectedObjects(resultDetectedObjects);
                        deleteObject?.(existedObjects?.[index] || null);
                      }}
                    />

                    <Modal
                      open={currentEditIndex === index && showEditModal}
                      onClose={() => setShowEditModal(false)}
                    >
                      <Box
                        sx={{
                          style: webStyle.editModal as React.CSSProperties,
                          display: "flex",
                          flexDirection: "column",
                          gridGap: "1rem",
                        }}
                      >
                        <Typography variant="h6">
                          Edit identified object for this image:
                        </Typography>
                        <Input
                          data-id="changeObjects"
                          name="changeObjects"
                          type="text"
                          style={webStyle.input}
                          value={inputValue || imgObject.class}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const userValue = event.target.value;
                            setInputValue(userValue);
                          }}
                          disableUnderline
                        />
                        <Button
                          data-test-id="change-btn"
                          style={webStyle.localButton}
                          onClick={() => {
                            const resultDetectedObjects = [...detectedObjects];
                            resultDetectedObjects[index] = {
                              ...detectedObjects[index],
                              class: inputValue,
                            };
                            setDetectedObjects(resultDetectedObjects);
                            setShowEditModal(false);

                            existedObjects &&
                              updateImage?.({
                                ...existedObjects?.[index],
                                name: inputValue,
                              });
                            setInputValue("");
                          }}
                        >
                          Change
                        </Button>
                      </Box>
                    </Modal>
                  </div>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
