const InputField = ({ label, value, onChange, name, placeholder, disabled, ...rest }: 
    { label: string } & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
    return (
        <>
            {label && <label htmlFor={name}>{label}</label>}
            <input
                type={'text'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                {...rest}
            />
        </>
    );
};

export default InputField;