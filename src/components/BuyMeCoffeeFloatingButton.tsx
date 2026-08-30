import React from 'react';

interface BuyMeCoffeeFloatingButtonProps {
  className?: string;
}

const BuyMeCoffeeFloatingButton: React.FC<BuyMeCoffeeFloatingButtonProps> = ({ className = '' }) => {
  const handleClick = () => {
    window.open('https://buymeacoffee.com/taptest', '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Support TapTest on Buy Me a Coffee"
      title="Support TapTest on Buy Me a Coffee"
      className={`fixed bottom-4 right-4 z-40 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FFDD00] hover:bg-[#FFDD00]/95 text-black shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group ${className}`}
    >
      <img
        src="https://cdn.buymeacoffee.com/widget/assets/coffee%20cup.svg"
        alt="Buy Me a Coffee"
        className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:rotate-12 transition-transform duration-200 pointer-events-none select-none"
      />
    </button>
  );
};

export default BuyMeCoffeeFloatingButton;
