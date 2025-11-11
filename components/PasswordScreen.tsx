
import React, { useState, useEffect } from 'react';

interface PasswordScreenProps {
  mode: 'setup' | 'login';
  onSubmit: (password: string) => void;
  onClose: () => void;
  error?: string;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ mode, onSubmit, onClose, error: externalError }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1); // For setup mode: 1 = set, 2 = confirm
  const [internalError, setInternalError] = useState('');

  const title = mode === 'setup'
    ? (step === 1 ? '设置4位密码' : '请再次输入以确认')
    : '输入密码';
  const subtitle = mode === 'setup'
    ? '为这个树洞创建一个密码。'
    : '请输入密码以进入。';
  
  const currentPin = step === 1 ? pin : confirmPin;
  const setCurrentPin = step === 1 ? setPin : setConfirmPin;

  const handlePinInput = (num: string) => {
    setInternalError('');
    if (currentPin.length < 4) {
      setCurrentPin(p => p + num);
    }
  };

  const handleDelete = () => {
    setCurrentPin(p => p.slice(0, -1));
  };
  
  useEffect(() => {
    if (mode === 'setup') {
      if (step === 1 && pin.length === 4) {
        setTimeout(() => setStep(2), 200);
      } else if (step === 2 && confirmPin.length === 4) {
        if (pin === confirmPin) {
          onSubmit(confirmPin);
        } else {
          setInternalError('两次输入的密码不匹配。');
          setTimeout(() => {
            setPin('');
            setConfirmPin('');
            setStep(1);
            setInternalError('');
          }, 1500);
        }
      }
    } else if (mode === 'login' && pin.length === 4) {
      onSubmit(pin);
      setTimeout(() => setPin(''), 200);
    }
  }, [pin, confirmPin, mode, step, onSubmit]);
  
  const renderPinDots = (value: string) => (
    <div className="flex justify-center space-x-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${value.length > i ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}></div>
      ))}
    </div>
  );

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 m-4 max-w-xs w-full text-center transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-6">{subtitle}</p>
        
        {renderPinDots(currentPin)}

        <div className="h-5 mt-3">
            {(externalError || internalError) && <p className="text-red-500 text-sm animate-shake">{externalError || internalError}</p>}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          {keypad.map((key) => (
            <button
              key={key}
              onClick={() => key === '⌫' ? handleDelete() : key === '' ? null : handlePinInput(key)}
              disabled={key === ''}
              className="text-xl p-3 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-0"
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
          .animate-shake { animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
    </div>
  );
};
