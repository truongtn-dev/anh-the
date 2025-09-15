import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageAnalysisResult, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function analyzeImage(imageFile: File): Promise<ImageAnalysisResult> {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = `Bạn là một chuyên gia AI kiểm tra ảnh hộ chiếu/visa với độ chính xác cao. Phân tích kỹ lưỡng hình ảnh được cung cấp và thực hiện hai nhiệm vụ:
1.  **Xác định giới tính:** Nhận diện giới tính của người trong ảnh.
2.  **Kiểm tra hợp lệ:** Đánh giá xem ảnh có khả năng bị từ chối khi nộp hồ sơ chính thức hay không dựa trên các tiêu chí nghiêm ngặt sau.

**Tiêu chí kiểm tra:**
- **Phông nền:** Nền phải là màu trơn, trung tính, không có bóng hoặc hoa văn.
- **Ánh sáng:** Khuôn mặt phải được chiếu sáng đều, không có bóng tối che khuất đường nét.
- **Tư thế:** Người phải nhìn thẳng vào máy ảnh, đầu thẳng, không nghiêng.
- **Biểu cảm:** Biểu cảm phải trung tính, mắt mở to, miệng ngậm.
- **Vật cản:** Khuôn mặt phải hoàn toàn rõ ràng, không bị tóc che mắt/chân mày, kính không lóa.
- **Chất lượng:** Ảnh phải rõ nét, không mờ, nhiễu hạt.

**Định dạng đầu ra:**
Cung cấp kết quả dưới dạng một đối tượng JSON duy nhất.
- Ở cấp cao nhất, thêm một trường "gender" với giá trị là "Nam" hoặc "Nữ".
- Thêm một trường "feedback" là một mảng các đối tượng. Đối với mỗi tiêu chí kiểm tra, tạo một đối tượng trong mảng này với:
  - "isGood": true nếu đạt, false nếu không đạt.
  - "message": Một câu phản hồi. Nếu không đạt, bắt đầu bằng "Ảnh bạn có thể bị từ chối vì...".`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          gender: { 
            type: Type.STRING, 
            description: "Giới tính được phát hiện, chỉ có thể là 'Nam' hoặc 'Nữ'." 
          },
          feedback: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                isGood: { type: Type.BOOLEAN },
                message: { type: Type.STRING },
              },
              required: ['isGood', 'message']
            },
          },
        },
        required: ['gender', 'feedback']
      },
    },
  });

  try {
    const jsonString = response.text.trim();
    // Gemini may wrap the JSON in markdown, so we need to strip it
    const cleanedJsonString = jsonString.replace(/^```json\s*|```\s*$/g, '');
    const parsed = JSON.parse(cleanedJsonString);
    if (parsed.gender !== 'Nam' && parsed.gender !== 'Nữ') {
        // Handle cases where AI returns an invalid gender string
        delete parsed.gender;
    }
    return parsed as ImageAnalysisResult;
  } catch (e) {
    console.error("Failed to parse JSON from analysis response:", response.text);
    // Return a default error feedback
    return {
      feedback: [{ isGood: false, message: "Không thể phân tích ảnh. Vui lòng thử lại." }]
    };
  }
}

export async function generateIdPhoto(
  imageFile: File,
  background: string,
  outfit: string,
  gender: string,
  hairstyle: string,
  aspectRatio: string,
  retouch: string,
  lighting: string,
  customPrompt: string
): Promise<{ image: string | null; text: string | null }> {
  const imagePart = await fileToGenerativePart(imageFile);

  let retouchPromptPart = '';
  switch (retouch) {
    case 'Nhẹ nhàng':
      retouchPromptPart = `**Skin Retouching (Gentle):** Perform gentle skin retouching. Smooth out minor blemishes, spots, or redness. Even out the skin tone slightly but you MUST preserve the natural skin texture. **Crucially, maintain the original skin tone and color; do not make it warmer or otherwise alter its hue.** The result should look natural, not overly airbrushed or fake.`;
      break;
    case 'Chuyên nghiệp':
      retouchPromptPart = `**Skin Retouching (Professional):** Apply professional-level skin retouching. Smooth the skin and even out the skin tone. **It is absolutely essential to maintain the original skin tone and color palette of the person. Do not make the skin tone warmer, cooler, or change its hue in any way.** Perform subtle dodging and burning to enhance facial contours (cheeks, nose, jawline) and add dimension, making the face look more defined. It is CRITICAL that you preserve essential details like skin texture for a realistic yet polished and high-end look.`;
      break;
    default: // 'Không'
      break;
  }
  
  const edits = [
    `**Background:** Completely replace the current background with a solid, even '${background}' color.`,
    `**Outfit:** Dress the person in a '${outfit}'. The outfit should look natural, fit the person's posture, and be appropriate for their specified gender: '${gender}'.`,
    `**Hairstyle:** ${hairstyle !== 'Giữ nguyên' ? `Change the person's hairstyle to '${hairstyle}'.` : 'Maintain the original hairstyle.'} The new hairstyle must look realistic and suit their face.`
  ];

  if (lighting === 'Bật') {
      edits.push(`**Lighting Adjustment (Studio Quality):** Simulate professional studio lighting on the person's face. The lighting must be soft and even. **Eliminate any harsh shadows, especially under the nose, chin, and around the eyes.** Ensure there are no hotspots or blown-out highlights on the skin. The goal is to create a balanced, well-lit portrait where facial features are clear and distinct.`);
  }

  if (retouchPromptPart) {
      edits.push(retouchPromptPart);
  }
  
  edits.push(`**Cropping & Aspect Ratio:** The final image must be a front-facing portrait, focusing on the head and shoulders. Crop the photo to a standard ID photo aspect ratio of '${aspectRatio}'. If 'Ảnh gốc' (Original) is selected, maintain the original aspect ratio but still apply all other edits.`);
  edits.push(`**Quality:** The final image must be of the highest possible resolution and quality, free from any digital noise or compression artifacts. Aim for a professional, sharp, and clear result suitable for printing. Do not add any text, watermarks, or other artifacts.`);
  
  const numberedEdits = edits.map((edit, index) => `${index + 1}. ${edit}`).join('\n\n');

  let prompt = `Please edit the user's photo to make it a professional, high-quality ID photo suitable for official documents.

**CRUCIAL INSTRUCTION: You MUST NOT alter the person's facial features, identity, or expression.** The primary goal is to preserve the exact likeness of the individual from the original photo. Any changes to the facial structure, eyes, nose, mouth, or skin tone are strictly forbidden. The person in the output image must be perfectly recognizable as the same person in the input image. This is the most important rule.

Apply the following edits based on the user's selections, while strictly adhering to the crucial instruction above:

${numberedEdits}
`;

  if (customPrompt) {
    prompt += `\n**Additional User Request:** ${customPrompt}\nThis is a high-priority instruction from the user that you must follow carefully.`;
  }


  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        imagePart,
        { text: prompt },
      ],
    },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  let generatedImage: string | null = null;
  let generatedText: string | null = null;

  if (response.candidates && response.candidates.length > 0) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        generatedImage = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      } else if (part.text) {
        generatedText = part.text;
      }
    }
  }

  return { image: generatedImage, text: generatedText };
}
