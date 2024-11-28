import React, { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { analyzeMultipleImages } from '../utils/openaiService';
import chubbLogo from '../assets/chubb-logo.png';

function MultiImageAccidentAnalysisApp() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = (event) => {
    const newFiles = event.target.files;
    if (newFiles) {
      const newImagesArray = Array.from(newFiles).map((file) => ({
        file,
        imageUrl: URL.createObjectURL(file),
        vehiclesInvolved: 'Not analyzed',
        accidentDetails: 'Not analyzed',
        surroundings: 'Not analyzed',
        condition: 'Not analyzed',
        overallAssesment: 'Not analyzed',
        analysisStatus: 'pending',
      }));

      setImages((prevImages) => [...prevImages, ...newImagesArray]);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedImages = await analyzeMultipleImages(images);
      setImages(updatedImages);
    } catch (err) {
      setError('Error analyzing images. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Header Section with Logo */}
      <header className="bg-white shadow-md p-4 flex justify-center items-center">
        <img
          src={chubbLogo} // Replace with the path to your logo file
          alt="App Logo"
          className="h-12"
        />
      </header>


      {/* Main Content Section */}
      <div className="flex-1 max-w-7xl mx-auto p-8">
        {/* Upload and Analyze Buttons */}
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
            onClick={() => document.getElementById('multi-image-upload').click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Upload size={20} /> Upload Images
          </button>
          {images.length > 0 && (
            <button
              onClick={analyzeImages}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Images'}
            </button>
          )}
        </div>

        {/* Image Analysis Table */}
        {images.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-4">Image</th>
                  <th className="p-4">Vehicles Involved</th>
                  <th className="p-4">Accident Details</th>
                  <th className="p-4">Surroundings</th>
                  <th className="p-4">Condition</th>
                  <th className="p-4">Overall Assesment</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {images.map((image, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4">
                      <img
                        src={image.imageUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    </td>
                    <td className="p-4">
                      {isLoading && image.analysisStatus === 'pending'
                        ? 'Analyzing...'
                        : image.vehiclesInvolved}
                    </td>
                    <td className="p-4">
                      {isLoading && image.analysisStatus === 'pending'
                        ? 'Analyzing...'
                        : image.accidentDetails}
                    </td>
                    <td className="p-4">
                      {isLoading && image.analysisStatus === 'pending'
                        ? 'Analyzing...'
                        : image.surroundings}
                    </td>
                    <td className="p-4">
                      {isLoading && image.analysisStatus === 'pending'
                        ? 'Analyzing...'
                        : image.condition}
                    </td>
                    <td className="p-4">
                      {isLoading && image.analysisStatus === 'pending'
                        ? 'Analyzing...'
                        : image.overallAssesment}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => removeImage(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <footer className="bg-gray-800 text-white text-center py-4">
        Powered by <span className="font-bold">RandomWalkAI</span>
      </footer>
    </div>
  );
}

export default MultiImageAccidentAnalysisApp;
