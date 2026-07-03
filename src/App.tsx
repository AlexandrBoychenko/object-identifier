import "./App.css";
import { ChangeEvent, useState } from "react";
import { ObjectDetectionModel } from "./components/ObjectDetectionModel";
import { IdentifierObject } from "./components/types";

function App() {
  const [currentImg, setCurrentImg] = useState<string[]>([]);
  const [objectIdentifier, setObjectIdentifier] =
    useState<IdentifierObject | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    const imagesToShow: string[] = [];

    [].forEach.call(uploadedFiles, (file) => {
      const imgUrl = URL.createObjectURL(file);
      imagesToShow.push(imgUrl);
    });
    setCurrentImg(imagesToShow);
  };

  return (
    <div className="App">
      <header className="App-header">Welcome to Object System</header>
      <h3 className="App-select">Select Image</h3>
      <input
        data-test-id="upldFileId"
        type="file"
        id="user-image"
        name="user-image"
        accept="image/png, image/jpeg"
        onChange={handleChange}
      />
      <div>
        {currentImg &&
          currentImg.map((imgLink) => (
            <ObjectDetectionModel
              data-test-id="object-detection-component"
              key={imgLink}
              imageLink={imgLink}
              setObjectIdentifier={setObjectIdentifier}
            />
          ))}
      </div>
    </div>
  );
}

export default App;
