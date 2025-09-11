import React, { useEffect } from "react";

interface ShowMessageProps {
  message: string;
  setMessage: (msg: string) => void;
}

const ShowMessage: React.FC<ShowMessageProps> = ({ message, setMessage }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, setMessage]);

  return null; // This component doesn't render anything directly, it just manages the message state
};

export default ShowMessage;
