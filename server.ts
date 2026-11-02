import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for receipt photos (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '65 SEOUL Hub Backend',
    ocrAvailable: !!ai,
    timestamp: new Date().toISOString(),
  });
});

// Secure Server-side OCR Endpoint
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'ไม่พบรูปภาพใบเสร็จ กรุณาถ่ายภาพหรือเลือกไฟล์' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'ระบบ OCR ยังไม่พร้อมใช้งานเนื่องจากไม่พบ GEMINI_API_KEY ในระบบ',
      });
    }

    // Strip data URL header if present
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9\/\-+.]+;base64,/, '');

    const prompt = `คุณคือผู้เชี่ยวชาญระดับสูงในการอ่านและวิเคราะห์ใบเสร็จรับเงิน/ใบกำกับภาษี/บิลซื้อของ (Receipt & Invoice OCR) สำหรับร้านอาหารเกาหลี 65 Seoul
จงวิเคราะห์ภาพใบเสร็จนี้ (อาจเป็นรูปถ่ายจากมือถือ หรือไฟล์สแกน จากห้างสรรพสินค้า ตลาดสด ร้านค้าส่ง หรือซัพพลายเออร์ เช่น แม็คโคร (Makro/CP Axtra), โลตัส (Lotus's), บิ๊กซี (Big C), ซีพี (CP Freshmart), เบทาโกร (Betagro), ตลาดไท, ตลาดสี่มุมเมือง, ตลาดสดท้องถิ่น, ร้านของชำเกาหลี (K-Market, Sarang Mart) ฯลฯ)

จงสกัดข้อมูลสำคัญและส่งคืนในรูปแบบ Pure JSON ห้ามมี markdown \`\`\`json หรือคำอธิบายใดๆ นอกเหนือจาก JSON:
{
  "billNumber": "เลขที่ใบเสร็จ หรือเลขที่ใบกำกับภาษี หากไม่พบให้ระบุ INV-ตามด้วยเวลาหรือรหัส",
  "date": "วันที่ในบิล รูปแบบ YYYY-MM-DD (หากเป็นปี พ.ศ. เช่น 2567, 2568 ให้แปลงเป็น ค.ศ. เช่น 2024, 2025)",
  "supplierName": "ชื่อร้านค้า หรือ บริษัทผู้ขาย เช่น Makro, Lotus's, CP, Betagro, ตลาดสดไท, K-Market (หากหัวบิลเขียน บมจ. ซีพี แอ็กซ์ตร้า ให้ระบุ Makro)",
  "category": "raw_material",
  "paymentMethod": "เงินสด",
  "items": [
    {
      "name": "ชื่อสินค้าหรือวัตถุดิบ (ตัดบาร์โค้ดที่ไม่จำเป็นออก ให้เหลือชื่อวัตถุดิบที่ชัดเจน เช่น หมูสามชั้นสไลด์, กิมจิ, ผักกาดขาว, โคชูจัง)",
      "quantity": 1,
      "unit": "กก.",
      "unitPrice": 100,
      "totalPrice": 100
    }
  ],
  "subtotal": 0,
  "discount": 0,
  "tax": 0,
  "totalAmount": 0,
  "rawText": "สรุปข้อความสำคัญจากบิล"
}

กฎเหล็กในการอ่านข้อมูล:
1. [ชื่อร้านค้า/ซัพพลายเออร์]: ต้องอ่านชื่อร้านค้าจากหัวใบเสร็จให้ชัดเจน ห้ามใส่ว่างเปล่า หรือคำว่า "ไม่ระบุ" หากมีชื่อหรือโลโก้ร้านค้าปรากฏ
2. [รายการสินค้า]: ดึงทุกรายการวัตถุดิบ/สินค้าที่มีในบิล โดยแยกจำนวน (quantity), หน่วยนับ (unit), ราคาต่อหน่วย (unitPrice) และยอดรวมแต่ละรายการ (totalPrice)
   - ห้ามนำแถวสรุปยอด เช่น "รวม", "ยอดสุทธิ", "VAT 7%", "เงินทอน" มาใส่เป็นรายการสินค้า
   - หากหน่วยนับไม่ระบุชัดเจน ให้ใส่ "หน่วย" หรือ "กก." หรือ "แพ็ค" ตามความเหมาะสม
3. [ยอดรวมสุทธิทั้งสิ้น - totalAmount]: ***สำคัญที่สุด*** ต้องอ่านยอดเงินสุทธิที่ต้องจ่ายจริงจากใบเสร็จ (Total, Grand Total, Net Total, ยอดรวมสุทธิ, จำนวนเงินทั้งสิ้น)
   - ตัวเลขต้องเป็น Number เท่านั้น (ห้ามมีเครื่องหมายจุลภาค , หรือสกุลเงิน ฿)
   - หากยอดรวมทั้งสิ้นในภาพเลือนหรือไม่ชัดเจน ให้คำนวณจากผลรวมของรายการทั้งหมดใน items (Subtotal - Discount + Tax)
   - ยอด totalAmount ต้องไม่เป็น 0 หากมีรายการสินค้าในใบเสร็จ
4. หมวดหมู่ category ให้เลือกค่าใดค่าหนึ่ง: "raw_material" (วัตถุดิบอาหาร), "packaging" (บรรจุภัณฑ์), "consumable" (ของใช้สิ้นเปลือง), "equipment" (อุปกรณ์ครัว), "other" (อื่นๆ)`;

    const inlinePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    let responseText = '';
    // Primary model: gemini-3.8-flash, with automatic fallback
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, inlinePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = response.text || '{}';
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.8-flash failed, attempting fallback to gemini-2.5-flash:', primaryErr?.message);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, inlinePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackResponse.text || '{}';
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Clean possible wrapper markdown if any
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // Helper to safely parse numbers with Thai digit support and strip symbols
    const parseNumber = (val: any): number => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val) return 0;
      // Convert Thai digits to Arabic digits if any
      const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
      let str = String(val);
      thaiDigits.forEach((td, idx) => {
        str = str.split(td).join(String(idx));
      });
      const cleaned = str.replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    // Calculate sum of line items safely
    const rawItems = Array.isArray(parsedData.items) ? parsedData.items : [];
    // Filter out rows that are actually summary rows (e.g. "รวมเงิน", "ยอดสุทธิ", "VAT")
    const filteredItems = rawItems.filter((item: any) => {
      const name = String(item.name || '').trim().toLowerCase();
      if (!name) return false;
      if (name.includes('ยอดสุทธิ') || name.includes('ยอดรวมทั้งสิ้น') || name.includes('รวมเงินทั้งสิ้น')) return false;
      if (name === 'vat 7%' || name === 'ภาษีมูลค่าเพิ่ม' || name === 'เงินทอน') return false;
      return true;
    });

    const normalizedItems = filteredItems.map((item: any, idx: number) => {
      const q = parseNumber(item.quantity) || 1;
      let u = parseNumber(item.unitPrice);
      let tot = parseNumber(item.totalPrice);

      if (tot <= 0 && u > 0) {
        tot = q * u;
      } else if (u <= 0 && tot > 0 && q > 0) {
        u = Math.round((tot / q) * 100) / 100;
      }

      return {
        ...item,
        name: String(item.name || `รายการที่ ${idx + 1}`).trim(),
        quantity: q,
        unit: item.unit ? String(item.unit).trim() : 'หน่วย',
        unitPrice: u,
        totalPrice: tot,
      };
    });

    const itemsSum = normalizedItems.reduce((acc: number, curr: any) => acc + (curr.totalPrice || 0), 0);
    const subtotal = parseNumber(parsedData.subtotal) || itemsSum;
    const discount = parseNumber(parsedData.discount);
    const tax = parseNumber(parsedData.tax || parsedData.vat);

    // Look for any alternative keys Gemini might have used for total
    let total = parseNumber(
      parsedData.totalAmount ?? 
      parsedData.total ?? 
      parsedData.grandTotal ?? 
      parsedData.netTotal ?? 
      parsedData.netAmount ?? 
      parsedData.total_amount ??
      parsedData.grand_total ??
      parsedData.amountDue
    );

    // If total is 0 or missing, calculate it automatically!
    if (total <= 0) {
      total = Math.max(0, subtotal - discount + tax);
      if (total <= 0 && itemsSum > 0) {
        total = itemsSum;
      }
    }

    // Smart supplier fallback if Gemini failed to extract a clean supplier name
    let detectedSupplier = String(parsedData.supplierName || '').trim();
    const rawSearch = (parsedData.rawText || '') + ' ' + detectedSupplier;
    const lowerRaw = rawSearch.toLowerCase();

    if (!detectedSupplier || detectedSupplier === 'ร้านค้า/ผู้จัดจำหน่าย' || detectedSupplier === 'ไม่ระบุ') {
      if (lowerRaw.includes('makro') || lowerRaw.includes('แม็คโคร') || lowerRaw.includes('axtra') || lowerRaw.includes('แอ็กซ์ตร้า')) {
        detectedSupplier = 'Makro (แม็คโคร)';
      } else if (lowerRaw.includes('lotus') || lowerRaw.includes('โลตัส') || lowerRaw.includes('เอก-ชัย')) {
        detectedSupplier = "Lotus's (โลตัส)";
      } else if (lowerRaw.includes('big c') || lowerRaw.includes('บิ๊กซี')) {
        detectedSupplier = 'Big C (บิ๊กซี)';
      } else if (lowerRaw.includes('cp fresh') || lowerRaw.includes('ซีพี เฟรช')) {
        detectedSupplier = 'CP Freshmart (ซีพี)';
      } else if (lowerRaw.includes('betagro') || lowerRaw.includes('เบทาโกร')) {
        detectedSupplier = 'Betagro (เบทาโกร)';
      } else if (lowerRaw.includes('ตลาดไท') || lowerRaw.includes('talaadthai')) {
        detectedSupplier = 'ตลาดไท';
      } else if (lowerRaw.includes('k-market') || lowerRaw.includes('k market') || lowerRaw.includes('korean')) {
        detectedSupplier = 'K-Market (ซัพพลายเออร์เกาหลี)';
      } else {
        detectedSupplier = 'ร้านค้า/ซัพพลายเออร์';
      }
    }

    parsedData.supplierName = detectedSupplier;
    parsedData.items = normalizedItems;
    parsedData.subtotal = Math.round(subtotal * 100) / 100;
    parsedData.discount = Math.round(discount * 100) / 100;
    parsedData.tax = Math.round(tax * 100) / 100;
    parsedData.totalAmount = Math.round(total * 100) / 100;

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('OCR processing error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการประมวลผล OCR ใบเสร็จ',
    });
  }
});

// AI Financial Advisor Endpoint
app.post('/api/ai-financial-advisor', async (req, res) => {
  try {
    const {
      periodType = 'day',
      periodLabel = 'วันนี้',
      salesTotal = 0,
      buffetSales = 0,
      foodSales = 0,
      otherSales = 0,
      purchaseTotal = 0,
      wagesTotal = 0,
      overheadTotal = 0,
      waterTotal = 0,
      electricityTotal = 0,
      rentTotal = 0,
      depreciationTotal = 0,
      netProfit = 0,
      profitMargin = 0,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'ระบบ AI ยังไม่พร้อมใช้งานเนื่องจากไม่พบ GEMINI_API_KEY',
      });
    }

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการเงินและที่ปรึกษาการบริหารร้านอาหาร (Restaurant Financial Consultant & CFO) สำหรับร้านอาหารปิ้งย่างเกาหลี 65 Seoul
โปรดวิเคราะห์สุขภาพทางการเงินและผลประกอบการของร้านจากข้อมูลตัวเลขจริงต่อไปนี้:

ช่วงเวลาที่วิเคราะห์: ${periodLabel} (${periodType})
1. รายรับทั้งหมด: ฿${Number(salesTotal).toLocaleString()}
   - ยอดขายบุฟเฟต์: ฿${Number(buffetSales).toLocaleString()}
   - ยอดขายอาหาร A la carte: ฿${Number(foodSales).toLocaleString()}
   - ยอดขายเครื่องดื่มและอื่นๆ: ฿${Number(otherSales).toLocaleString()}

2. ค่าใช้จ่ายทั้งหมด: ฿${(Number(purchaseTotal) + Number(wagesTotal) + Number(overheadTotal)).toLocaleString()}
   - ต้นทุนจัดซื้อวัตถุดิบ (Food Cost): ฿${Number(purchaseTotal).toLocaleString()} (${salesTotal > 0 ? ((purchaseTotal / salesTotal) * 100).toFixed(1) : 0}%)
   - ค่าจ้างพนักงาน (Labor Cost): ฿${Number(wagesTotal).toLocaleString()} (${salesTotal > 0 ? ((wagesTotal / salesTotal) * 100).toFixed(1) : 0}%)
   - ค่าใช้จ่ายดำเนินการคงที่ (Overhead - ค่าน้ำ, ค่าไฟ, ค่าเช่า, ค่าเสื่อมราคาเฉลี่ย): ฿${Number(overheadTotal).toLocaleString()} (${salesTotal > 0 ? ((overheadTotal / salesTotal) * 100).toFixed(1) : 0}%)
     * ค่าน้ำ: ฿${Number(waterTotal).toLocaleString()}
     * ค่าไฟ: ฿${Number(electricityTotal).toLocaleString()}
     * ค่าเช่าสถานที่: ฿${Number(rentTotal).toLocaleString()}
     * ค่าเสื่อมราคา: ฿${Number(depreciationTotal).toLocaleString()}

3. กำไรสุทธิ (Net Profit): ฿${Number(netProfit).toLocaleString()}
   - อัตรากำไรสุทธิ (Net Profit Margin): ${Number(profitMargin).toFixed(1)}%
   - ต้นทุนหลักรวม Prime Cost (Food Cost + Labor Cost): ${salesTotal > 0 ? (((purchaseTotal + wagesTotal) / salesTotal) * 100).toFixed(1) : 0}% (เกณฑ์มาตรฐานร้านอาหารที่ดีไม่ควรเกิน 55-60%)

จงให้ผลการวิเคราะห์เป็น Pure JSON ตามโครงสร้างนี้เท่านั้น (ห้ามใส่ markdown \`\`\`json):
{
  "period": "${periodLabel}",
  "summary": "สรุปภาพรวมสถานะการเงินและความสามารถในการทำกำไรของร้านสั้นกระชับ 2-3 ประโยค",
  "healthScore": 85,
  "foodCostPct": ${salesTotal > 0 ? Number(((purchaseTotal / salesTotal) * 100).toFixed(1)) : 0},
  "laborCostPct": ${salesTotal > 0 ? Number(((wagesTotal / salesTotal) * 100).toFixed(1)) : 0},
  "overheadPct": ${salesTotal > 0 ? Number(((overheadTotal / salesTotal) * 100).toFixed(1)) : 0},
  "profitMarginPct": ${Number(profitMargin).toFixed(1)},
  "strengths": [
    "จุดแข็งหรือข้อดี เช่น อัตรากำไรสูง, คุมค่าแรงได้ดีตามเกณฑ์มาตรฐาน"
  ],
  "warnings": [
    "ข้อควรระวังหรือจุดเสี่ยงทางการเงิน เช่น สัดส่วน Food Cost สูงเกินเกณฑ์ หรือ ค่าไฟต่อวันค่อนข้างสูง"
  ],
  "recommendations": [
    "คำแนะนำเชิงปฏิบัติการเฉพาะสำหรับร้านอาหารเกาหลี 65 Seoul เช่น การปรับโปรโมชั่น, การคุมการสูญเสียวัตถุดิบ (Yield & Waste), การจัดกะพนักงาน"
  ],
  "analyzedAt": "${new Date().toISOString()}"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let analysis: any;
    try {
      analysis = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('AI Financial Advisor error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`65 SEOUL Hub Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
