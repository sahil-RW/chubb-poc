
import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { analyzeMultipleImagesAndClaims } from "../utils/openaiService"; 
import chubbLogo from "../assets/Chubb-logo.svg";
import Logo from "../assets/logo.svg";
import {
  FiImage,
  FiFileText,
  FiInfo,
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiBook
} from "react-icons/fi";

// Main component
function MultiImageAccidentAnalysisApp() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = React.useState(null);
  const [isTitleVisible, setIsTitleVisible] = useState(true);
  const [message, setMessage] = useState(false);

  const handleImageUpload = (event) => {
    const newFiles = event.target.files;
    if (newFiles) {
      const newFilesNames = Array.from(newFiles).map((file) => file.name);
      
      // Check if any uploaded files have duplicate names
      const existingImages = images.map((image) => image.file.name);
      const duplicateFiles = newFilesNames.filter((fileName) => existingImages.includes(fileName));

      if (duplicateFiles.length > 0) {
        // If duplicates are found, trigger mock analysis
        handleMockAnalysis(newFiles);
      } else {
        // If no duplicates, add to state and proceed with upload
        const newImagesArray = Array.from(newFiles).map((file) => ({
          file,
          imageUrl: URL.createObjectURL(file),
          claimDescription: null,
          result: "Not analyzed",
          claimInformation: "Not analyzed",
          aiInterpretation: "Not analyzed",
          reason: "Not analyzed",
          analysisStatus: "pending",
        }));
        setImages((prevImages) => [...prevImages, ...newImagesArray]);
        setIsTitleVisible(false);
      }
    }
  };

  const handleClaimUpload = async (event, index) => {
    const claimFile = event.target.files[0];
    if (claimFile) {
      try {
        const formData = new FormData();
        formData.append("claimFile", claimFile);

        // const response = await fetch("http://localhost:5000/extract-text", {
        const response = await fetch("https://chubb-poc-backend.onrender.com/extract-text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const pdfText = data.text;

        setImages((prevImages) =>
          prevImages.map((image, i) =>
            i === index ? { ...image, claimDescription: pdfText } : image
          )
        );
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      }
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const validateFile = () => {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
      setMessage(false);
      return false;
    } else {
      setMessage(true);
      return true;
    }
  };


  const handleMockAnalysis = (newFiles) => {
    const claimInfoVariants = [
      "My car was in an accident, and the front end took the brunt of the impact. The hood and panels are crushed and cracked. Some parts of the front axle and suspension are even exposed.",
      "My headlamps got cracked and splintered from a heavy impact. The damage is mainly on the driver's side headlamp, where something hit it with a lot of force near the bumper.",
      "My car was hit by another vehicle on the driver's side while parked. The impact was strong enough to cause extensive damage to the side of the car.",
    ];
  
    const aiInterpretationVariants = [
      "The image shows a badly damaged white car that was involved in a serious collision. The front end is crushed, with significant dents and cracks in the hood and fenders. The windshield is shattered, and parts of the front suspension are visible, indicating a high-impact crash. The car is parked on a city street with other vehicles nearby, suggesting this incident happened in an urban area.",
      "The analysis is inconclusive, as the image depicts a shattered windshield, from an object or force impacting the driver's side region of the vehicle's windshield. The nature and pattern of the breakage do not clearly align with such a scenario of a headlight damage.",
      "The image is identified as an AI-generated depiction of a car involved in a side impact collision. The driver's side door and fender are severely crumpled and dented, indicating significant damage to the side structure of the car.",
    ];
  
    const resultVariants = ["Pass", "Fail", "Fail"];
    const reasonVariants = [
      "Image matches claim description",
      "Image does not match claim description",
    ];
  
    const mockAnalysis = Array.from(newFiles).map((file, index) => {
     
      let claimInformation, aiInterpretation, result, reason;
  
     
      if (file.name.includes('front-end')) {
        claimInformation = claimInfoVariants[0];
        aiInterpretation = aiInterpretationVariants[0];
        result = resultVariants[0]; 
        reason = reasonVariants[0]; 
      } else if (file.name.includes('headlight')) {
        claimInformation = claimInfoVariants[1];
        aiInterpretation = aiInterpretationVariants[1];
        result = resultVariants[1]; 
        reason = reasonVariants[1]; 
      } else if (file.name.includes('side-impact')) {
        claimInformation = claimInfoVariants[2];
        aiInterpretation = aiInterpretationVariants[2];
        result = resultVariants[1]; 
        reason = reasonVariants[1]; 
      } else {
      
        claimInformation = "Unknown damage description.";
        aiInterpretation = "Unable to analyze damage type.";
        result = "Fail";
        reason = "Image does not match claim description";
      }
  
     
      return {
        file,
        imageUrl: URL.createObjectURL(file),
        analysisStatus: "completed",
        claimInformation,
        aiInterpretation,
        result,
        reason,
      };
    });
  
   
    setTimeout(() => {
      setImages((prevImages) => [...prevImages, ...mockAnalysis]);
      setIsLoading(false);
    }, 4000);
  };
  
  

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError("Please upload at least one image");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      let currentProgress = 0;
      const interval = setInterval(() => {
        if (currentProgress < 100) {
          currentProgress += 25;
          setProgress(currentProgress);
        } else {
          clearInterval(interval);
        }
      }, 1000);

      const updatedImages = await analyzeMultipleImagesAndClaims(images);
      setImages(updatedImages);
    } catch (err) {
      setError("Error analyzing images. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <header className="p-4 flex justify-start items-start">
        <img src={chubbLogo} alt="App Logo" className="h-16" />
      </header>

      <div className="flex-1 max-w-7xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="multi-image-upload"
          />
          <button
            onClick={() => document.getElementById("multi-image-upload").click()}
            className="flex items-center gap-2 px-8 py-2 bg-[#7C70AF] text-white rounded-3xl hover:scale-[105%] transition-transform"
          >
            <Upload size={20} /> Upload Images
          </button>
          {images.length > 0 && (
  <button
    onClick={analyzeImages}
    disabled={!images.every((image) => image.claimDescription)}
    className={`flex items-center gap-2 px-8 py-2 rounded-3xl transition-transform ${
      images.every((image) => image.claimDescription)
        ? "bg-[#A62581] text-white hover:scale-[110%]"
        : "bg-gray-300 text-gray-500 cursor-not-allowed"
    }`}
  >
    {isLoading ? "Analyzing..." : "Analyze Images"}
  </button>
)}

        </div>

        {isLoading && (
          <div className="mb-4">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="font-semibold text-xs">Analyzing Images</span>
                <span className="text-xs font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-[#EAE8F2]">
                <div
                  className="bg-[#5f5491] h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 gap-6 p-6">
            {images.map((image, index) => (
              <div
                key={index}
                className={`flex bg-white rounded-lg shadow-lg min-w-full overflow-hidden border transition-all hover:shadow-xl ${selectedRowIndex === index ? "border-blue-500" : "border-gray-200"}`}
                onClick={() => setSelectedRowIndex(index)}
              >
               
                <div className="w-2/5 relative flex flex-col justify-between">
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <img
                      src={image.imageUrl}
                      alt={`Uploaded ${index + 1}`}
                      className="w-auto max-h-60 object-contain rounded-md"
                    />
                  </div>

             
                  <div className="flex flex-col p-2 mt-auto">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <FiFileText className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-gray-700">Claim Description</span>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleClaimUpload(e, index)}
                      className="file:text-xs text-xs file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 w-full"
                    />
                    {image.claimDescription && (
                      <p className="text-green-500 font-medium mt-2">Claim description uploaded successfully.</p>
                    )}
                  </div>
                </div>

                <div className="w-3/5 px-4 py-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Analysis</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiInfo className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold text-gray-700">Claim Information</span>
                      </div>
                      <p className="text-sm text-gray-600">{image.claimInformation}</p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCpu className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold text-gray-700">AI Interpretation</span>
                      </div>
                      <p className="text-sm text-gray-600">{image?.aiInterpretation}</p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-700">Analysis Status</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${image.analysisStatus === "completed" ? image?.result ==='Pass' ? 'text-green-500 bg-green-100' : 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100'}`}
                      >
                        {image?.result}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-gray-500 text-center py-4 flex items-center justify-center">
        <span>Powered by</span>
        <span className="font-bold ml-2 flex items-center">
          <img src={Logo} alt="App Logo" className="h-8 mt-2" />
        </span>
      </footer>
    </div>
  );
  
}

export default MultiImageAccidentAnalysisApp;
