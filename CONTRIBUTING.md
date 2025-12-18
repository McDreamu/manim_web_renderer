# Contributing to Manim Web Renderer

First off, thanks for taking the time to contribute!

## Development Setup

1.  **Clone the repo** and enter the directory:
    ```bash
    git clone https://github.com/your-username/manim-web-renderer.git
    cd manim-web-renderer
    ```

2.  **Install backend dependencies**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Run the server**:
    ```bash
    python server.py
    ```
    The app will be available at `http://localhost:8000`.

## Code Style

*   **Python:** Follow PEP 8.
*   **JavaScript:** Use standard ES6+ syntax.
*   **Language:** Keep comments and documentation in **English**.

## Pull Requests

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## Reporting Bugs

Please use the Issue Templates to report bugs or suggest enhancements. Include:
*   Browser version.
*   Manim version (from `manim --version`).
*   Steps to reproduce.
