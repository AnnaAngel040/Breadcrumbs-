1. What Models Power the AI Pipeline?
Model	Architecture	Role	File Location
Model 1	Fine-Tuned PyTorch Transformer (DistilBERT/RoBERTa)	Classifies whether check-in is a stressor vs calm reflection (stress_score: 0-1).	backend/app/stress_model/
Model 2	Scikit-Learn (TF-IDF + Logistic Regression)	Categorizes stressors into 8 domains (Academics, Finances, Work, Relationship, Health, etc.).	backend/app/model2_*.pkl (already in git)
Speech-to-Text	Live Browser Web Speech Recognition	Instant mic transcription directly to Model 1 & 2 without heavy GPU downloads.	Built into Chrome/Edge
2. Python Packages to Install
Open a terminal in backend/ and run:

bash


pip install fastapi uvicorn scikit-learn joblib torch transformers safetensors python-dotenv pytest
3. Place Model 1 Weights
Unzip stress_model_final.zip.
Move the files into backend/app/stress_model/ so the folder contains:


backend/app/stress_model/
├── model.safetensors   (255 MB PyTorch weights)
├── config.json
├── tokenizer.json
└── tokenizer_config.json
4. Ensure Zero Fallback (Environment Configuration)
In backend/, create or check the file named .env and set:

env


USE_MOCK_MODEL=false
USE_MOCK_TRANSCRIPTION=false
ENABLE_SENTIMENT_FUSION=false
5. Verify Real AI Inference (Pre-Flight Test)
Run this one-line command to test that both Model 1 and Model 2 load into memory and run live:

bash


python -c "
from app.model_client import get_stress_prediction
from app.categorize import predict_model2, categorize_with_reason
print('\n=== 1. MODEL 1 (PyTorch Transformer) LIVE TEST ===')
m1_res = get_stress_prediction('I am completely overwhelmed by my exams and cannot sleep')
print('Prediction:', m1_res)
assert m1_res['stress_score'] > 0.8, 'Model 1 is not running!'
print('\n=== 2. MODEL 2 (Scikit-Learn Classifier) LIVE TEST ===')
m2_res = categorize_with_reason('I cannot afford rent this month')
print('Prediction:', m2_res)
assert m2_res['category'] == 'Finances', 'Model 2 is not running!'
print('\n✅ SUCCESS: ALL AI MODELS ARE RUNNING LIVE WITH ZERO FALLBACKS!\n')
"
6. Start the Servers
Terminal 1: Backend Server
bash


cd backend
python -m uvicorn app.main:app --reload --port 8000
(You will see the terminal load the PyTorch weights on CPU on startup).

Terminal 2: Frontend App
bash


cd frontend
npm install
npm run dev
Open your browser to http://localhost:5173 (using Google Chrome or Edge).

7. How to Test in the Browser
Click "Continue as Member".
Click the microphone icon and speak:
"I have three big exams this week and my professor gave us impossible assignments."
Watch the live classification:
Model 1 computes stress intensity (~0.92).
Model 2 maps it directly to Academics.
The UI displays a gentle acknowledgment card with a button to find matched burnout clinicians in India.