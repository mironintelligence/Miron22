"""
MironLaw 1.0 — QLoRA Fine-tuning Script
Kaggle Notebooks (T4 GPU, 16GB VRAM) için optimize edilmiştir.

Kullanım (Kaggle'da):
  1. Bu dosyayı Kaggle Notebook'a kopyala
  2. GPU T4 x1 seç (Settings > Accelerator)
  3. Internet On seç
  4. Tüm hücreleri çalıştır

Model: Qwen2.5-7B-Instruct (en iyi Türkçe performansı)
Yöntem: QLoRA 4-bit + LoRA rank=64
Süre: ~20-30 saat (Kaggle 30h/hafta limiti var, birkaç haftada bitir)
"""

# ════════════════════════════════════════════════
# HÜCRE 1 — Kurulum
# ════════════════════════════════════════════════
CELL_1_SETUP = '''
%%capture
!pip install unsloth[colab-new] -q
!pip install --no-deps trl peft accelerate bitsandbytes -q
!pip install datasets huggingface_hub -q
'''

# ════════════════════════════════════════════════
# HÜCRE 2 — Imports & Config
# ════════════════════════════════════════════════
CELL_2_CONFIG = '''
import os, json, torch
from unsloth import FastLanguageModel
from trl import SFTTrainer, TrainingArguments, DataCollatorForSeq2Seq
from datasets import load_dataset, Dataset
from huggingface_hub import login

# ── HuggingFace Login (Kaggle Secret'tan al) ──
HF_TOKEN = os.environ.get("HF_TOKEN", "")  # Kaggle > Add-ons > Secrets > HF_TOKEN
if HF_TOKEN:
    login(token=HF_TOKEN)

# ── Konfigürasyon ──
MODEL_NAME   = "Qwen/Qwen2.5-7B-Instruct"
OUTPUT_NAME  = "mironlaw-1.0"
HF_REPO      = "mironintelligence/MironLaw-1.0"

MAX_SEQ_LEN  = 2048
LORA_RANK    = 64
BATCH_SIZE   = 2
GRAD_ACCUM   = 8          # effective batch = 16
LR           = 2e-4
EPOCHS       = 2
WARMUP_STEPS = 100

print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
'''

# ════════════════════════════════════════════════
# HÜCRE 3 — Model Yükle
# ════════════════════════════════════════════════
CELL_3_MODEL = '''
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LEN,
    dtype=None,           # otomatik (bfloat16 veya float16)
    load_in_4bit=True,    # QLoRA 4-bit quantization
)

model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=LORA_RANK,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
    use_rslora=True,      # Rank-Stabilized LoRA — daha iyi convergence
)

print(model.print_trainable_parameters())
'''

# ════════════════════════════════════════════════
# HÜCRE 4 — Dataset Yükle
# ════════════════════════════════════════════════
CELL_4_DATASET = '''
# Dataset'i HF'ten yükle
# Önce pipeline.py ile oluşturup HF'e push etmen gerekiyor
# VEYA: yerel JSONL dosyalarını Kaggle'a yükle

def load_jsonl(path):
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


# Seçenek A: HuggingFace'ten yükle
try:
    ds = load_dataset("mironintelligence/mironlaw-train-data", split="train")
    print(f"HF'ten yüklendi: {len(ds):,} örnek")
except Exception:
    # Seçenek B: Kaggle'a upload ettiğin dosyadan yükle
    print("HF dataset bulunamadı, yerel dosya aranıyor...")
    data = load_jsonl("/kaggle/input/mironlaw-data/train.jsonl")
    ds = Dataset.from_list(data)
    print(f"Yerel dosyadan yüklendi: {len(ds):,} örnek")


# ChatML formatına çevir (Qwen için)
def apply_chat_template(examples):
    texts = []
    for messages in examples["messages"]:
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
        texts.append(text)
    return {"text": texts}

ds = ds.map(apply_chat_template, batched=True)
print(f"Dataset hazır: {len(ds):,} örnek")
print("Örnek:\\n", ds[0]["text"][:500])
'''

# ════════════════════════════════════════════════
# HÜCRE 5 — Training
# ════════════════════════════════════════════════
CELL_5_TRAIN = '''
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=ds,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    data_collator=DataCollatorForSeq2Seq(tokenizer=tokenizer),
    dataset_num_proc=2,
    packing=True,          # Sequence packing — %40 daha hızlı training
    args=TrainingArguments(
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        warmup_steps=WARMUP_STEPS,
        num_train_epochs=EPOCHS,
        learning_rate=LR,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=50,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=42,
        output_dir=OUTPUT_NAME,
        report_to="none",
        save_strategy="steps",
        save_steps=500,
        save_total_limit=3,
    ),
)

# Başlat
print("Training başlıyor...")
trainer_stats = trainer.train()
print(f"Training tamamlandı!")
print(f"Loss: {trainer_stats.training_loss:.4f}")
print(f"Süre: {trainer_stats.metrics[\'train_runtime\']:.0f}s")
'''

# ════════════════════════════════════════════════
# HÜCRE 6 — Test
# ════════════════════════════════════════════════
CELL_6_TEST = '''
# Inference test
FastLanguageModel.for_inference(model)

test_messages = [
    {"role": "system", "content": "Sen MironLaw 1.0, Türk hukuku uzmanı bir yapay zeka asistanısın."},
    {"role": "user", "content": "İş kazasında işverenin hukuki sorumluluğu nedir?"},
]

inputs = tokenizer.apply_chat_template(
    test_messages,
    tokenize=True,
    add_generation_prompt=True,
    return_tensors="pt",
).to("cuda")

outputs = model.generate(
    input_ids=inputs,
    max_new_tokens=512,
    temperature=0.3,
    top_p=0.9,
    do_sample=True,
)

response = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)
print("MironLaw 1.0 Yanıtı:")
print("=" * 60)
print(response)
'''

# ════════════════════════════════════════════════
# HÜCRE 7 — HuggingFace'e Push
# ════════════════════════════════════════════════
CELL_7_PUSH = '''
# LoRA adapter'ı kaydet ve push et
model.save_pretrained_merged(
    OUTPUT_NAME + "_merged",
    tokenizer,
    save_method="merged_16bit",  # Full model (inference için)
)

# HuggingFace'e push et
model.push_to_hub_merged(
    HF_REPO,
    tokenizer,
    save_method="merged_16bit",
    token=HF_TOKEN,
)

# GGUF formatında da kaydet (llama.cpp ile çalışır)
model.save_pretrained_gguf(
    OUTPUT_NAME + "_gguf",
    tokenizer,
    quantization_method="q4_k_m",   # En iyi quality/size dengesi
)
model.push_to_hub_gguf(
    HF_REPO + "-GGUF",
    tokenizer,
    quantization_method="q4_k_m",
    token=HF_TOKEN,
)

print(f"Model yüklendi: https://huggingface.co/{HF_REPO}")
print(f"GGUF yüklendi: https://huggingface.co/{HF_REPO}-GGUF")
'''


# Kaggle notebook formatında yazdır
if __name__ == "__main__":
    print("=" * 70)
    print("MironLaw 1.0 — Kaggle Training Guide")
    print("=" * 70)
    print("""
Kaggle'da şu adımları izle:

1. kaggle.com/code → New Notebook
2. Settings > Accelerator > GPU T4 x1
3. Settings > Internet > On
4. Add-ons > Secrets > HF_TOKEN ekle

Hücreleri sırayla çalıştır:
""")
    for i, (name, code) in enumerate([
        ("KURULUM", CELL_1_SETUP),
        ("CONFIG", CELL_2_CONFIG),
        ("MODEL YÜKLE", CELL_3_MODEL),
        ("DATASET YÜKLE", CELL_4_DATASET),
        ("TRAINING", CELL_5_TRAIN),
        ("TEST", CELL_6_TEST),
        ("HF PUSH", CELL_7_PUSH),
    ], 1):
        print(f"{'─'*60}")
        print(f"Hücre {i}: {name}")
        print(code.strip())
        print()
