interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    value: string;
}

const InputField = ({ label, value, ...rest }: InputFieldProps) => {
    const { name } = rest;
    return (
        <>
            {label && <label htmlFor={name}>{label}</label>}
            <input
                type='text'
                value={value}
                {...rest}
            />
        </>
    );
};

export default InputField;