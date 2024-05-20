"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Formik, FormikProps, Form } from "formik";
import { Checkbox, Dropdown } from "@/components";
import * as yup from "yup";
import classNames from "classnames";

export type CleaningParams = {
  dropNa: boolean;
  dropDuplicates: boolean;
  dropColumns: string[];
  fillNa: boolean;
  fillNaValue?: "median" | "mean" | "mode" | "backwards" | "custom" | "";
  fillCustomNaValue?: string;
};

const defaultParams: CleaningParams = {
  dropNa: false,
  dropDuplicates: true,
  dropColumns: [],
  fillNa: false,
  fillNaValue: "",
  fillCustomNaValue: "",
};

const validationSchema = yup.object().shape({
  fillCustomNaValue: yup
    .string()
    .when("fillNaValue", ([fillNaValue], schema) =>
      fillNaValue === "custom" ? schema.required("Required Field.") : schema
    ),
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

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

  const handleSubmit = async (params: CleaningParams) => {
    if (!file) return;
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
      <Formik
        initialValues={defaultParams}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {({ values }: FormikProps<CleaningParams>) => {
          return (
            <Form className="container mx-auto">
              <div className="flex justify-center mt-10">
                <div
                  className="mx-auto w-1/2 relative border-2 border-dashed border-blue-gray-400 bg-blue-gray-200 rounded-lg p-4 flex justify-center"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <span className="text-blue-gray-700">
                    {file?.name || "Drop a file here or click to upload"}
                  </span>
                </div>
              </div>

              <div
                className={classNames(
                  "container  w-1/2 mx-auto mt-8 transition-all duration-500",
                  {
                    "opacity-0 pointer-events-none": !file,
                  }
                )}
              >
                <button
                  type="submit"
                  className="w-full -top-4 bg-blue-600 hover:bg-blue-800 text-white p-2 rounded-md relative transition-opacity duration-500"
                >
                  Clean .CSV
                </button>
                <div className={`transition-all duration-1000`}>
                  <div className="container mx-auto mt-1 flex justify-center">
                    <Checkbox
                      name="dropDuplicates"
                      label="Drop duplicate rows"
                    />
                    <Checkbox
                      name="dropNa"
                      label="Drop rows with missing values"
                    />
                    <Checkbox name="fillNa" label="Fill missing values" />
                  </div>
                  <Dropdown values={values} />
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </main>
  );
}
