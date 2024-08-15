import React from 'react';

const Button = ({ label, ...rest }: 
    { label: string } & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
) => {
    return (
        <button
            type='button'
            className="skip-button"
            {...rest}
        >
            {label}
        </button>
    );
}

export default Button;
