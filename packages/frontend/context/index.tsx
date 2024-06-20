"use client";
import React, {
  createContext,
  FC,
  useReducer,
  ReactNode,
  useContext,
} from "react";

interface FileState {
  file: File | null;
  setFile: (file: File | null) => void;
  fileError: boolean;
  setFileError: (error: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  processedFile: string | null;
  setProcessedFile: (file: string | null) => void;
}

const Reducer = (
  state: FileState,
  action: { type: string; payload: any }
): FileState => {
  switch (action.type) {
    case "SET_FILE":
      return {
        ...state,
        file: action.payload,
      };
    case "SET_FILE_ERROR":
      return {
        ...state,
        fileError: action.payload,
      };
    case "SET_IS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_PROCESSED_FILE":
      return {
        ...state,
        processedFile: action.payload,
      };
    default:
      return state;
  }
};

const initialState: FileState = {
  file: null,
  setFile: () => {},
  fileError: false,
  setFileError: () => {},
  isLoading: false,
  setIsLoading: () => {},
  processedFile: null,
  setProcessedFile: () => {},
};

export const FileContext = createContext(initialState);

export const FileProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(Reducer, initialState);

  function setFile(file: File | null) {
    dispatch({
      type: "SET_FILE",
      payload: file,
    });
  }

  function setFileError(error: boolean) {
    dispatch({
      type: "SET_FILE_ERROR",
      payload: error,
    });
  }

  function setIsLoading(loading: boolean) {
    dispatch({
      type: "SET_IS_LOADING",
      payload: loading,
    });
  }

  function setProcessedFile(file: string | null) {
    dispatch({
      type: "SET_PROCESSED_FILE",
      payload: file,
    });
  }

  return (
    <FileContext.Provider
      value={{
        file: state.file,
        setFile: setFile,
        fileError: state.fileError,
        setFileError: setFileError,
        isLoading: state.isLoading,
        setIsLoading: setIsLoading,
        processedFile: state.processedFile,
        setProcessedFile: setProcessedFile,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFileContext = () => useContext(FileContext);
