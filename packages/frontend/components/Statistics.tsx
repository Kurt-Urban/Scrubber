"use client";
import React, { FC, useState } from "react";
import { useFileContext } from "@/context";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

type Stats = {
  totalrows: number;
  duplicaterows: number;
  modifiedrows: number;
  corruptedrows: number;
};

const Statistics: FC = () => {
  const { processedFile } = useFileContext();

  const stats = processedFile?.metadata as Stats;

  const data = {
    labels: [
      `Duplicate Rows (${stats.duplicaterows})`,
      `Modified Rows (${stats.modifiedrows})`,
      `Corrupted Rows (${stats.corruptedrows})`,
      `Remaining Rows (${
        stats.totalrows -
        stats.duplicaterows -
        stats.modifiedrows -
        stats.corruptedrows
      })`,
    ],
    datasets: [
      {
        data: [
          stats.duplicaterows,
          stats.modifiedrows,
          stats.corruptedrows,
          stats.totalrows -
            stats.duplicaterows -
            stats.modifiedrows -
            stats.corruptedrows,
        ],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
      },
    ],
  };
  return (
    <div>
      <hr className="border border-blue-gray-300 w-2/3 mx-auto mt-6" />
      <div className="flex flex-col items-center">
        <span className="flex items-center mt-6">
          <h2 className="text-xl mr-3 text-gray-700">Processed File:</h2>
          <a
            href={processedFile?.url || ""}
            download="processed.csv"
            className="py-2 px-4 bg-blue-700 rounded text-gray-300 transition-all hover:bg-blue-800"
          >
            Download
          </a>
        </span>
      </div>
      <hr className="border border-blue-gray-300 w-2/3 mx-auto mt-6" />
      <div className="w-2/3 mx-auto flex justify-center mt-4">
        <div className="w-1/2">
          <div className="text-xl text-center text-gray-700">Statistics</div>
          <div className="text-center text-gray-700 mb-2">
            Total Rows Processed: {stats.totalrows}
          </div>
          <Doughnut data={data} />
        </div>
      </div>
      <div className="w-2/3 mx-auto flex justify-center mt-10">
        <button
          onClick={() => window.location.reload()}
          className="py-2 px-4 bg-blue-700 rounded text-gray-300 transition-all hover:bg-blue-800 w-1/3"
        >
          Upload New File
        </button>
      </div>
    </div>
  );
};

export default Statistics;
