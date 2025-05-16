import os
import openai
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from pathlib import Path

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load Excel data
EXCEL_PATH = Path(__file__).resolve().parent.parent / "Sample_data.xlsx"
df = pd.read_excel(EXCEL_PATH)

@api_view(['GET'])
def analyze_area(request):
    query = request.GET.get('query', '').strip().lower()

    try:
        # ========== Handle Compare ==========
        if query.startswith("compare"):
            if " and " not in query:
                return Response({"error": "Use format: Compare Area1 and Area2"}, status=400)

            parts = query.replace("compare", "").strip().split(" and ")
            if len(parts) != 2:
                return Response({"error": "Please provide exactly two areas for comparison."}, status=400)

            area1 = parts[0].strip()
            area2 = parts[1].strip()

            areas_lower = df['final location'].str.lower().unique()
            missing = [a for a in [area1, area2] if a not in areas_lower]
            if missing:
                return Response({"error": f"Area(s) not found: {', '.join(missing)}"}, status=404)

            df1 = df[df['final location'].str.lower() == area1]
            df2 = df[df['final location'].str.lower() == area2]

            chart1 = df1.groupby("year")["flat total"].sum().reset_index()
            chart1["area"] = area1.title()

            chart2 = df2.groupby("year")["flat total"].sum().reset_index()
            chart2["area"] = area2.title()

            combined_chart = pd.concat([chart1, chart2], ignore_index=True).to_dict(orient="records")

            summary = f"Demand comparison between {area1.title()} and {area2.title()} based on flat units sold."

            return Response({
                "summary": summary,
                "chart": combined_chart,
                "table": []
            })

        # ========== Handle Analyze ==========
        elif query.startswith("analyze"):
            area = query.replace("analyze", "").strip()
            filtered = df[df['final location'].str.lower() == area]

            if filtered.empty:
                return Response({"error": f"No data found for {area}"}, status=404)

            chart_data = (
                filtered.groupby("year")["flat - weighted average rate"]
                .mean()
                .reset_index()
                .to_dict(orient="records")
            )

            avg_price = int(filtered['flat - weighted average rate'].mean())
            total_units = int(filtered['flat total'].sum())

            # Use OpenAI to generate summary
            if openai.api_key:
                prompt = (
                    f"Give a short summary of real estate data for {area.title()}. "
                    f"Average flat price is ₹{avg_price} and total units sold is {total_units}."
                )
                try:
                    response = openai.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=100,
                        temperature=0.7,
                    )
                    summary = response.choices[0].message.content.strip()
                except Exception as e:
                    summary = f"{area.title()} has an average flat price of ₹{avg_price} and total {total_units} units sold. (LLM error: {e})"
            else:
                summary = f"{area.title()} has an average flat price of ₹{avg_price} and total {total_units} units sold."

            table_data = filtered.to_dict(orient="records")

            return Response({
                "summary": summary,
                "chart": chart_data,
                "table": table_data
            })

        # ========== Invalid Query ==========
        else:
            return Response({"error": "Query must start with 'Analyze' or 'Compare'."}, status=400)

    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)
