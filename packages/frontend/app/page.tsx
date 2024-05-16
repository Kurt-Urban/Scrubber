"use client";
import React from "react";
import axios from "axios";

export default function Home() {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    // Handle the dropped file
    console.log(file);
  };

  const handleTestClick = async () => {
    try {
      const response = await axios.get("http://localhost:3001/");
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.message);
        if (error.response) {
          console.error(error.response.data);
        }
      } else {
        console.error(error);
      }
    }
  };

  return (
    <main className="h-screen">
      <div className="flex justify-center w-full mt-10">
        <h1 className="text-4xl font-thin">Scrubber CSV Cleaner</h1>
      </div>
      <div className="container mx-auto">
        <div className="flex justify-center mt-10">
          <div
            className="w-1/2 hover:cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <input type="file" className="w-full" placeholder="Upload a file" />
            <div className="mt-4 border-2 border-dashed border-gray-400 rounded-lg p-4">
              <p className="text-gray-500 text-center">
                Drag and drop files here
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-10">
          <button
            onClick={handleTestClick}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Axios
          </button>
        </div>
      </div>
    </main>
  );
}
