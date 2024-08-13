import React from 'react';
import "../styles/button.css";


const Button = ({ label, ...rest }: 
    { label: string } & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
) => {
    return (
        <button
            type='button'
            className={`skip-button`}
            {...rest}
        >
            {label}
        </button>
    );
}

export default Button;
