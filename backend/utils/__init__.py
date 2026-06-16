import cv2


def extract_edges(image, low_threshold=55, high_threshold=155):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    return cv2.Canny(blurred, low_threshold, high_threshold)
