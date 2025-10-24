import React from "react";
import "../App.css";

const Footer = () => {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} <span className="funbox-logo">Funbox</span> Created by <strong>Abdulrahman</strong>
      </p>
    </footer>
  );
};

export default Footer;
