import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.toString()}</p>
                    <details style={{ whiteSpace: "pre-wrap", textAlign: "left", marginTop: "10px" }}>
                        {this.state.error?.stack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
