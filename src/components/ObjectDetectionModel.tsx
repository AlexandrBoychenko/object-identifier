import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  browser,
  LayersModel,
  loadLayersModel,
  Tensor,
} from "@tensorflow/tfjs";
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
import {
  DetectedObject,
  Detection,
  EditObject,
  IdentifierObject,
} from "./types";

const CLASS_NAMES = ["tanks", "ships", "car", "person"];

const COLORS = ["#FF3B30", "#34C759", "#007AFF", "#FF9500"];

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
  const [objectDetector, setObjectDetectors] = useState<LayersModel | null>(
    null,
  );
  const [detectedObjects, setDetectedObjects] = useState<Detection[]>([]);
  const [imageBase64, setImageBase64] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentEditIndex, setCurrentEditIndex] = useState<
    number | undefined
  >();
  const [showEditModal, setShowEditModal] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const loadOCRModel = async () => {
    const model = await loadLayersModel("/model/model.json");
    setObjectDetectors(model);
  };

  const parseDetections = (data: DetectedObject): Detection[] => {
    const detections: Detection[] = [];

    let i = 0;
    const numDetections = data[i++];

    for (let d = 0; d < numDetections; d++) {
      const labelIndex = data[i++];
      const score = data[i++];
      const x = data[i++];
      const y = data[i++];
      const width = data[i++];
      const height = data[i++];

      if (score < 0.4) continue;

      detections.push({ labelIndex, score, x, y, width, height });
    }

    return detections;
  };

  const startDetecting = async () => {
    if (imageEle.current) {
      const tensor = browser
        .fromPixels(imageEle.current)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255)
        .expandDims();

      const prediction = objectDetector?.predict(tensor) as Tensor;
      const data = prediction.dataSync();

      const detections = parseDetections(data);

      console.log("prediction: ", prediction);

      data && setDetectedObjects(detections);
    }
  };

  console.log("detectedObjects: ", detectedObjects);

  useMemo(() => {
    const originalClosePath = CanvasRenderingContext2D.prototype.closePath;

    // Override the prototype method with custom hook
    CanvasRenderingContext2D.prototype.closePath = function (...args) {
      setImgLoading(false);

      // Call the original function to ensure the canvas still draws properly
      return originalClosePath.apply(this, args);
    };
  }, []);

  const draw = () => {
    const ctx = canvasEle?.current?.getContext("2d");
    const detections = detectedObjects;

    const canvas = canvasEle.current;
    const image = imageEle.current;

    if (ctx && canvas && image) {
      canvas.width = image.width;
      canvas.height = image.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      detections.forEach((det) => {
        const { labelIndex, score, x, y, width, height } = det;

        if (!labelIndex) return;
        if (!score) return;

        const color = COLORS[labelIndex % COLORS.length];
        const label = `${CLASS_NAMES[labelIndex]} ${(score * 100).toFixed(1)}%`;

        // Convert normalized → pixels
        const left = x * canvas.width;
        const top = y * canvas.height;
        const w = width * canvas.width;
        const h = height * canvas.height;

        // Draw box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, w, h);

        // Background
        ctx.fillStyle = color;
        const textWidth = ctx.measureText(label).width + 10;
        ctx.fillRect(left, top - 22, textWidth, 22);

        // Text
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.fillText(label, left + 5, top - 6);
      });
    }
  };

  useEffect(() => {
    setTimeout(() => loadOCRModel(), 1600);
  }, [imageLink]);

  useEffect(() => {
    objectDetector && startDetecting();
  }, [objectDetector]);

  useEffect(() => {
    detectedObjects && draw();
  }, [detectedObjects]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          mt: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
        {imgLoading && (
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
                  <div key={index}>
                    <Chip
                      data-test-id="chip-btn"
                      label={index}
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
                          value={inputValue}
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
                              //   class: inputValue,
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
