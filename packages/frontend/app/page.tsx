"use client";
import React from "react";
import axios from "axios";

type cleaningParams = {
  dropNa: boolean;
  dropDuplicates: boolean;
  dropColumns: string[];
  fillNa: boolean;
  fillNaValue?: "median" | "mean" | "mode" | "backwards" | number | string;
};

export default function Home() {
  const [file, setFile] = React.useState<File | null>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    setFile(droppedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleTestClick = async () => {
    if (!file) return;

    const params: cleaningParams = {
      dropNa: true,
      dropDuplicates: true,
      dropColumns: ["column1", "column2"],
      fillNa: true,
      fillNaValue: "mean",
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("params", JSON.stringify(params));

    try {
      const res = await axios.post("http://localhost:3001/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log(res);
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
            className="w-1/2"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <input
              type="file"
              className="w-full"
              placeholder="Upload a file"
              onChange={handleFileChange}
            />
            <div className="mt-4 bg-gray-300 border-2 border-dashed border-gray-400 rounded-lg p-4">
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
