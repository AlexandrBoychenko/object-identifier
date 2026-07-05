import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  browser,
  GraphModel,
  LayersModel,
  loadGraphModel,
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

const LABELS = ["корабель", "танк"];

const COLORS = ["#FF3B30", "#34C759"];

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
  const [objectDetector, setObjectDetectors] =
    useState<GraphModel<string> | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<Detection[]>([]);
  const [imageBase64, setImageBase64] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentEditIndex, setCurrentEditIndex] = useState<
    number | undefined
  >();
  const [showEditModal, setShowEditModal] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  const loadOCRModel = async () => {
    const model = await loadGraphModel("/model/model.json");
    setObjectDetectors(model);
  };

  const drawDetection = (
    bbox:
      | Float32Array<ArrayBufferLike>
      | Uint8Array<ArrayBufferLike>
      | Int32Array<ArrayBufferLike>, // [[x, y, w, h]]
    classes:
      | Float32Array<ArrayBufferLike>
      | Uint8Array<ArrayBufferLike>
      | Int32Array<ArrayBufferLike>, // [[...probs]]
  ) => {
    const canvas = canvasEle.current;
    const image = imageEle.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || !image) return;

    const imageWidth = image.width;
    const imageHeight = image.height;

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    // clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🔲 Extract bbox
    const [x, y, w, h] = bbox;

    // 🎯 Convert normalized → pixels
    const px = (x - w / 2) * imageWidth;
    const py = (y - h / 2) * imageHeight;
    const pw = w * imageWidth;
    const ph = h * imageHeight;

    // 🏷️ Get class
    const classId = classes.indexOf(Math.max(...classes));
    const confidence = classes[classId];
    const label = LABELS[classId];

    // 🎨 Draw rectangle
    ctx.strokeStyle = COLORS[classId];
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);

    // 🏷️ Draw label background
    ctx.fillStyle = COLORS[classId];
    ctx.fillRect(px, py - 25, 120, 25);

    // ✍️ Draw text
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`${label} (${confidence.toFixed(2)})`, px + 5, py - 5);
  };

  const startDetecting = async () => {
    if (imageEle.current) {
      const tensor = browser
        .fromPixels(imageEle.current)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255)
        .expandDims();

      const [bboxTensor, classTensor] = objectDetector?.execute(tensor, [
        "Identity:0",
        "Identity_1:0",
      ]) as Tensor[];

      const bbox = await bboxTensor.data();
      const classes = await classTensor.data();

      console.log("bbox, classes:", bbox, classes);

      // data && setDetectedObjects(detections);

      drawDetection(bbox, classes);
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

  useEffect(() => {
    setTimeout(() => loadOCRModel(), 1600);
  }, [imageLink]);

  useEffect(() => {
    objectDetector && imageEle.current && startDetecting();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectDetector, imageEle.current]);

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
          alt="object"
          style={{
            maxWidth: "30rem",
            objectFit: "contain",
            // visibility: "hidden",
            position: "absolute",
          }}
        />
        <canvas
          data-test-id="canvasEl"
          ref={canvasEle}
          style={{
            maxWidth: "30rem",
            objectFit: "contain",
            zIndex: 1,
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
