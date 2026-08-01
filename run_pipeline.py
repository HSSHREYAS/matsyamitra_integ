from analytics.end_to_end_pipeline import run_end_to_end_pipeline


def main() -> None:
    summary = run_end_to_end_pipeline()
    print(summary.to_text())


if __name__ == "__main__":
    main()
