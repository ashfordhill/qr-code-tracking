def generate_zpl(url: str) -> str:
    return (
        "^XA"
        "^FO50,50"
        f"^BQN,2,5"
        "^FH"
        f"^FDQA,{url}^FS"
        "^FO50,250"
        "^A0N,28,28"
        f"^FD{url}^FS"
        "^XZ"
    )
