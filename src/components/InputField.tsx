interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    placeholder?: string;
    disabled?: boolean;
}

const InputField = ({ label, value, onChange, name, placeholder, disabled, ...rest }: InputFieldProps) => {
    return (
        <>
            {label && <label htmlFor={name}>{label}</label>}
            <input
                type='text'
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