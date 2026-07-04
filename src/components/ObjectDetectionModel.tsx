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

const LABELS = ["tanks", "ships", "car", "person"];

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
    bbox: number[][], // [[x, y, w, h]]
    classes: number[][], // [[...probs]]
  ) => {
    const canvas = canvasEle.current;
    const image = imageEle.current;

    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.drawImage(image, 0, 0);

    const scaleX = canvas.width / 224;
    const scaleY = canvas.height / 224;

    bbox.forEach((box, i) => {
      let [x, y, w, h] = box;

      // 🚨 FIX 1: handle negative width/height
      if (w < 0) {
        x = x + w;
        w = Math.abs(w);
      }

      if (h < 0) {
        y = y + h;
        h = Math.abs(h);
      }

      // 🚨 FIX 2: scale to image
      let px = x * scaleX;
      let py = y * scaleY;
      let pw = w * scaleX;
      let ph = h * scaleY;

      // 🚨 FIX 3: enforce MIN SIZE
      const MIN_SIZE = 500;
      pw = Math.max(pw, MIN_SIZE);
      ph = Math.max(ph, MIN_SIZE);

      // 🚨 FIX 4: clamp inside canvas
      px = Math.max(0, Math.min(px, canvas.width - pw));
      py = Math.max(0, Math.min(py, canvas.height - ph)) + 50;

      // 🎯 class
      const probs = classes[i];
      const classId = probs.indexOf(Math.max(...probs));
      const confidence = Math.max(...probs);

      // ✅ draw box
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, pw, ph);

      // ✅ ALWAYS visible center dot
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, 5, 0, 2 * Math.PI);
      ctx.fill();

      // ✅ label
      const text = `${LABELS[classId]} ${(confidence * 100).toFixed(1)}%`;

      ctx.font = "16px Arial";
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = "#00FF00";
      ctx.fillRect(px, py - 20, textWidth + 10, 20);

      ctx.fillStyle = "#000";
      ctx.fillText(text, px + 5, py - 5);

      // 🧠 DEBUG LOG
      console.log("DRAWN BOX:", { px, py, pw, ph });
    });

    console.log(
      JSON.stringify({
        bbox,
        classes,
        imageSize: {
          w: imageEle.current?.naturalWidth,
          h: imageEle.current?.naturalHeight,
        },
      }),
    );
  };

  const startDetecting = async () => {
    if (imageEle.current) {
      const tensor = browser
        .fromPixels(imageEle.current)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255)
        .expandDims();

      // const detection = await objectDetector?.executeAsync(tensor);

      const [bboxTensor, classTensor] = (await objectDetector?.executeAsync(
        tensor,
      )) as any;

      // convert to JS arrays
      const bbox = await bboxTensor.array();
      const classes = await classTensor.array();

      console.log("bbox:", bbox);
      console.log("classes:", classes);

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
