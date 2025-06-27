


// WhatsAppFloatingButton.jsx
import { useState, useEffect } from "react";
import whatsapp from '../assets/images/icons/whatsapp.png'

const WhatsAppFloatingButton = () => {
  const phoneNumber = "5581999999999";
  const message = "Olá! Gostaria de obter mais informações?";

  const [showTooltip, setShowTooltip] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (

    <>
    
      {showTooltip && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            right: "110px",
            background: "rgba(209, 0, 0, 0.64)",
            color: "#fff",
            padding: "0.5em 1em",
            borderRadius: "6px",
            fontSize: "0.9em",
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
            zIndex: 1001,
            whiteSpace: "nowrap",
          }}
        >
          Fale conosco via WhatsApp
        </div>
      )}

      {showWelcome && (
        <>
            {/* Primeira mensagem */}
            <div
            style={{
                position: "fixed",
                bottom: "155px",
                right: "65px",
                background: "#25D366",
                color: "#fff",
                fontWeight: 500,
                padding: "0.5em 1em",
                borderRadius: "6px 6px 0 6px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
                fontSize: "0.9em",
                animation: "fadeInSlide 1s ease-out forwards",
                zIndex: 999,
            }}
            >
            👋 Olá! Tudo bem? Precisa de ajuda?
            </div>

            {/* Segunda mensagem */}
            <div
            style={{
                position: "fixed",
                bottom: "110px",
                right: "65px",
                background: "#25D366",
                color: "#fff",
                fontWeight: 500,
                padding: "0.5em 1em",
                borderRadius: "6px 6px 0 6px",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
                fontSize: "0.9em",
                animation: "fadeInSlide 1.5s ease-out forwards",
                zIndex: 998,
            }}
            >
            📲 Estamos Online e prontos para atender você!
            </div>
        </>
        )}

      <a
        href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "35px",
          right: "35px",
          width: "60px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          cursor: "pointer",
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <img
          src={whatsapp}
          alt="WhatsApp"
          style={{ width: "64px", height: "64px" }}
        />
      </a>

      <style>
        {`
          @keyframes fadeInSlide {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
};

export default WhatsAppFloatingButton;
