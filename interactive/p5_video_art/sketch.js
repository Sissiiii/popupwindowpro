     // Define the target container for the webcam
      const targetWidth = width * 0.5;
      const targetHeight = height * 0.5;;// sketch.js

let bodypix; // BodyPix 模型实例
let video; // 摄像头视频
let segmentation; // 存储人体分割结果

// 降低视频分辨率以提高性能
const vScale = 16;

// BodyPix 模型参数
const options = {
  // 模型的“自信度”阈值，值越低，越容易将像素识别为人体
  // 我们设一个极低的值 (0.01)，让模型在任何情况下都尽可能地识别人体
  segmentationThreshold: 0.01,
  // 以下为性能相关的默认参数，保持即可
  outputStride: 8,
}

function setup() {
  createCanvas(640, 480); // 创建画布
  pixelDensity(1);

  // 1. 加载视频，并在视频准备好后调用 videoReady 函数，这是确保稳定的关键
  video = createCapture(VIDEO, videoReady);
  video.size(width / vScale, height / vScale);
  video.hide(); // 隐藏原始的HTML视频元素

  // 设置文字样式
  fill(255); // 数字颜色为白色
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(vScale);
  textFont('monospace');
}

// 2. 视频准备好后，此函数会被自动调用
function videoReady() {
  console.log('视频已准备好 (Video ready!)');
  // 3. 加载 BodyPix 模型，加载完成后调用 modelReady 函数
  bodypix = ml5.bodyPix(video, options, modelReady);
}

// 4. 模型准备好后，此函数会被自动调用
function modelReady() {
  console.log('人体分割模型已准备好 (Model ready!)');
  // 5. 开始持续对视频进行人体分割，每次有结果时调用 gotResults
  bodypix.segment(gotResults);
}

// 6. 每当模型分析完一帧，此函数会被调用
function gotResults(error, result) {
  if (error) {
    console.error(error);
    return;
  }
  // 保存分割结果
  segmentation = result;
  // 立即开始下一次分割，形成稳定循环
  bodypix.segment(gotResults);
}

function draw() {
  // 始终将原始摄像头画面作为背景
  image(video, 0, 0, width, height);

  // 只有在成功获取到分割结果后才执行绘制
  if (segmentation) {
    video.loadPixels(); // 加载视频的像素数据

    // 遍历所有像素（基于低分辨率的视频）
    for (let y = 0; y < video.height; y++) {
      for (let x = 0; x < video.width; x++) {
        const index = x + y * video.width;

        // 检查当前像素是否被识别为人体 (任何非 -1 的值都算)
        if (segmentation.data[index] > -1) {
          const pIndex = index * 4;
          const r = video.pixels[pIndex + 0];
          const g = video.pixels[pIndex + 1];
          const b = video.pixels[pIndex + 2];

          // 根据像素亮度计算要显示的数字 (0-9)
          const bright = (r + g + b) / 3;
          const num = floor(map(bright, 0, 255, 0, 9));

          // 在放大后的画布对应位置绘制数字
          text(num, x * vScale, y * vScale);
        }
      }
    }
  }
}
