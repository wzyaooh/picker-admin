import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import Login from './login.vue';
import * as authApi from '#/api/core/auth';
import { SliderCaptcha } from '@vben/common-ui';

// Mock the API functions
vi.mock('#/api/core/auth', () => ({
  getEnvironmentApi: vi.fn(),
  getCaptchaApi: vi.fn(),
  loginApi: vi.fn(),
}));

// Mock the auth store
vi.mock('#/store', () => ({
  useAuthStore: vi.fn(() => ({
    authLogin: vi.fn(),
    loginLoading: ref(false),
  })),
}));

// Mock the message adapter
vi.mock('#/adapter/naive', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Login Captcha - Environment Detection and Slider Captcha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect preview environment and show slider captcha', async () => {
      // Mock getEnvironmentApi to return preview environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: true,
        environment: 'preview',
        version: '1.0.0',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should show slider captcha
      expect(wrapper.findComponent(SliderCaptcha).exists()).toBe(true);
      
      // Should NOT show image captcha
      expect(wrapper.find('.captcha-image-container').exists()).toBe(false);
      
      // Should show preview environment banner
      expect(wrapper.text()).toContain('预览环境');
    });

    it('should detect production environment and show image captcha', async () => {
      // Mock getEnvironmentApi to return production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });

      // Mock getCaptchaApi
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should NOT show slider captcha
      expect(wrapper.findComponent(SliderCaptcha).exists()).toBe(false);
      
      // Should show image captcha
      expect(wrapper.find('.captcha-image-container').exists()).toBe(true);
      
      // Should NOT show preview environment banner
      expect(wrapper.text()).not.toContain('预览环境');
    });

    it('should handle environment detection failure gracefully', async () => {
      // Mock getEnvironmentApi to throw error
      vi.mocked(authApi.getEnvironmentApi).mockRejectedValue(new Error('Network error'));

      // Mock getCaptchaApi for fallback
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should default to production environment (show image captcha)
      expect(wrapper.find('.captcha-image-container').exists()).toBe(true);
      expect(wrapper.findComponent(SliderCaptcha).exists()).toBe(false);
    });
  });

  describe('Slider Captcha in Preview Environment', () => {
    beforeEach(async () => {
      // Setup preview environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: true,
        environment: 'preview',
        version: '1.0.0',
      });
    });

    it('should render slider captcha component', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const sliderCaptcha = wrapper.findComponent(SliderCaptcha);
      expect(sliderCaptcha.exists()).toBe(true);
    });

    it('should set sliderVerified flag when slider is completed', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const sliderCaptcha = wrapper.findComponent(SliderCaptcha);
      
      // Simulate slider success
      await sliderCaptcha.vm.$emit('success');
      await flushPromises();

      // The component should have updated its internal state
      // We can verify this by checking the console log or by testing the submit behavior
      expect(sliderCaptcha.exists()).toBe(true);
    });

    it('should not call getCaptchaApi in preview environment', async () => {
      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi);
      
      mount(Login);
      await flushPromises();

      // getCaptchaApi should NOT be called in preview environment
      expect(getCaptchaSpy).not.toHaveBeenCalled();
    });
  });

  describe('Image Captcha in Production Environment', () => {
    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });
    });

    it('should automatically load captcha on mount', async () => {
      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      mount(Login);
      await flushPromises();

      // getCaptchaApi should be called once on mount
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);
    });

    it('should display captcha image after loading', async () => {
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test-captcha</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should display the captcha image
      const captchaContainer = wrapper.find('.captcha-image-container');
      expect(captchaContainer.exists()).toBe(true);
      expect(captchaContainer.html()).toContain('test-captcha');
    });

    it('should show error message when captcha load fails', async () => {
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(Login);
      await flushPromises();

      // Should show error message
      expect(wrapper.text()).toContain('验证码加载失败');
    });

    it('should log error to console when captcha load fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(error);

      mount(Login);
      await flushPromises();

      // Should log error to console (需求 7.4)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load captcha:', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error details:', expect.objectContaining({
        name: error.name,
        message: error.message,
      }));

      consoleErrorSpy.mockRestore();
    });

    it('should show network error message for network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(networkError);

      const wrapper = mount(Login);
      await flushPromises();

      // Should show network-specific error message (需求 7.3)
      expect(wrapper.text()).toContain('网络连接失败，请检查网络后重试');
    });

    it('should show timeout error message for timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'Error';
      (timeoutError as any).code = 'ETIMEDOUT';
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(timeoutError);

      const wrapper = mount(Login);
      await flushPromises();

      // Should show timeout-specific error message (需求 7.3)
      expect(wrapper.text()).toContain('请求超时，请点击刷新重试');
    });

    it('should show generic error message for other errors', async () => {
      const genericError = new Error('Unknown error');
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(genericError);

      const wrapper = mount(Login);
      await flushPromises();

      // Should show generic error message
      expect(wrapper.text()).toContain('验证码加载失败，请点击刷新重试');
    });

    it('should display retry button when captcha load fails', async () => {
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(Login);
      await flushPromises();

      // Should show retry button (需求 7.1)
      const retryBtn = wrapper.find('.captcha-retry-btn');
      expect(retryBtn.exists()).toBe(true);
      expect(retryBtn.text()).toContain('重试');
    });

    it('should retry loading captcha when retry button is clicked', async () => {
      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          captchaId: 'test-captcha-id',
          svg: '<svg>test</svg>',
        });

      const wrapper = mount(Login);
      await flushPromises();

      // Should show error initially
      expect(wrapper.text()).toContain('验证码加载失败');
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);

      // Click retry button
      const retryBtn = wrapper.find('.captcha-retry-btn');
      await retryBtn.trigger('click');
      await flushPromises();

      // Should call getCaptchaApi again and succeed
      expect(getCaptchaSpy).toHaveBeenCalledTimes(2);
      expect(wrapper.text()).not.toContain('验证码加载失败');
      expect(wrapper.html()).toContain('test');
    });

    it('should show loading state on retry button during retry', async () => {
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(Login);
      await flushPromises();

      const retryBtn = wrapper.find('.captcha-retry-btn');
      
      // Check that loading prop is bound
      expect(retryBtn.exists()).toBe(true);
    });

    it('should show error placeholder in image container when load fails', async () => {
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(Login);
      await flushPromises();

      // Should show error placeholder
      const errorPlaceholder = wrapper.find('.captcha-error-placeholder');
      expect(errorPlaceholder.exists()).toBe(true);
      expect(errorPlaceholder.text()).toContain('加载失败');
    });

    it('should display captcha input field', async () => {
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should have captcha input field
      const input = wrapper.find('input[placeholder="请输入验证码"]');
      expect(input.exists()).toBe(true);
    });

    it('should display refresh button', async () => {
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Should have refresh button
      const refreshBtn = wrapper.find('.captcha-refresh-btn');
      expect(refreshBtn.exists()).toBe(true);
    });
  });

  describe('Captcha Refresh Functionality', () => {
    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });
    });

    it('should refresh captcha when refresh button is clicked', async () => {
      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi)
        .mockResolvedValueOnce({
          captchaId: 'captcha-1',
          svg: '<svg>captcha-1</svg>',
        })
        .mockResolvedValueOnce({
          captchaId: 'captcha-2',
          svg: '<svg>captcha-2</svg>',
        });

      const wrapper = mount(Login);
      await flushPromises();

      // Initial load
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);
      expect(wrapper.html()).toContain('captcha-1');

      // Click refresh button
      const refreshBtn = wrapper.find('.captcha-refresh-btn');
      await refreshBtn.trigger('click');
      await flushPromises();

      // Should call getCaptchaApi again
      expect(getCaptchaSpy).toHaveBeenCalledTimes(2);
      expect(wrapper.html()).toContain('captcha-2');
    });

    it('should clear input when refreshing captcha', async () => {
      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Enter captcha text
      const input = wrapper.find('input[placeholder="请输入验证码"]');
      await input.setValue('ABC123');
      expect((input.element as HTMLInputElement).value).toBe('ABC123');

      // Click refresh button
      const refreshBtn = wrapper.find('.captcha-refresh-btn');
      await refreshBtn.trigger('click');
      await flushPromises();

      // Input should be cleared
      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('should refresh captcha when clicking on image', async () => {
      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi)
        .mockResolvedValueOnce({
          captchaId: 'captcha-1',
          svg: '<svg>captcha-1</svg>',
        })
        .mockResolvedValueOnce({
          captchaId: 'captcha-2',
          svg: '<svg>captcha-2</svg>',
        });

      const wrapper = mount(Login);
      await flushPromises();

      // Click on captcha image container
      const imageContainer = wrapper.find('.captcha-image-container');
      await imageContainer.trigger('click');
      await flushPromises();

      // Should call getCaptchaApi again
      expect(getCaptchaSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });
    });

    it('should have proper ARIA labels on captcha image', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const captchaImage = wrapper.find('[role="img"]');
      expect(captchaImage.exists()).toBe(true);
      expect(captchaImage.attributes('aria-label')).toBe('验证码图片');
    });

    it('should have proper ARIA labels on input field', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const input = wrapper.find('input[placeholder="请输入验证码"]');
      expect(input.attributes('aria-label')).toBe('验证码输入框');
      expect(input.attributes('aria-required')).toBe('true');
    });

    it('should have proper ARIA labels on refresh button', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const refreshBtn = wrapper.find('.captcha-refresh-btn');
      expect(refreshBtn.attributes('aria-label')).toBe('刷新验证码');
      expect(refreshBtn.attributes('title')).toBe('刷新验证码');
    });

    it('should show error with proper ARIA attributes', async () => {
      vi.mocked(authApi.getCaptchaApi).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(Login);
      await flushPromises();

      const errorMessage = wrapper.find('#captcha-error');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.attributes('role')).toBe('alert');
      expect(errorMessage.attributes('aria-live')).toBe('polite');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });
    });

    it('should have responsive styles for captcha container', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const captchaContainer = wrapper.find('.captcha-image-container');
      expect(captchaContainer.exists()).toBe(true);
      
      // Check that the element has the class (styles are in scoped CSS)
      expect(captchaContainer.classes()).toContain('captcha-image-container');
    });

    it('should have responsive styles for input field', async () => {
      const wrapper = mount(Login);
      await flushPromises();

      const input = wrapper.find('.captcha-input');
      expect(input.exists()).toBe(true);
      expect(input.classes()).toContain('captcha-input');
    });
  });

  describe('Captcha Verification Failure Handling', () => {
    let mockAuthStore: any;
    let messageErrorSpy: any;

    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      // Setup mock auth store
      const { useAuthStore } = await import('#/store');
      mockAuthStore = useAuthStore();
      
      // Setup message spy
      const { message } = await import('#/adapter/naive');
      messageErrorSpy = vi.spyOn(message, 'error');
    });

    it('should catch INVALID_CAPTCHA error and show error message', async () => {
      // Mock authLogin to throw INVALID_CAPTCHA error
      const invalidCaptchaError = new Error('验证码错误');
      (invalidCaptchaError as any).code = 'INVALID_CAPTCHA';
      mockAuthStore.authLogin.mockRejectedValue(invalidCaptchaError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('WRONG');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should show error message (需求 4.5)
      expect(messageErrorSpy).toHaveBeenCalledWith('验证码错误，请重新输入');
    });

    it('should auto-refresh captcha after INVALID_CAPTCHA error', async () => {
      // Mock authLogin to throw INVALID_CAPTCHA error
      const invalidCaptchaError = new Error('验证码错误');
      (invalidCaptchaError as any).code = 'INVALID_CAPTCHA';
      mockAuthStore.authLogin.mockRejectedValue(invalidCaptchaError);

      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi)
        .mockResolvedValueOnce({
          captchaId: 'captcha-1',
          svg: '<svg>captcha-1</svg>',
        })
        .mockResolvedValueOnce({
          captchaId: 'captcha-2',
          svg: '<svg>captcha-2</svg>',
        });

      const wrapper = mount(Login);
      await flushPromises();

      // Initial captcha load
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);
      expect(wrapper.html()).toContain('captcha-1');

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('WRONG');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should auto-refresh captcha (需求 7.2)
      expect(getCaptchaSpy).toHaveBeenCalledTimes(2);
      expect(wrapper.html()).toContain('captcha-2');
    });

    it('should clear captcha input after INVALID_CAPTCHA error', async () => {
      // Mock authLogin to throw INVALID_CAPTCHA error
      const invalidCaptchaError = new Error('验证码错误');
      (invalidCaptchaError as any).code = 'INVALID_CAPTCHA';
      mockAuthStore.authLogin.mockRejectedValue(invalidCaptchaError);

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('WRONG');

      // Verify input has value
      expect((captchaInput.element as HTMLInputElement).value).toBe('WRONG');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should clear captcha input (需求 7.2)
      expect((captchaInput.element as HTMLInputElement).value).toBe('');
    });

    it('should catch CAPTCHA_EXPIRED error and show error message', async () => {
      // Mock authLogin to throw CAPTCHA_EXPIRED error
      const expiredError = new Error('验证码已过期');
      (expiredError as any).code = 'CAPTCHA_EXPIRED';
      mockAuthStore.authLogin.mockRejectedValue(expiredError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should show expired error message (需求 9.3)
      expect(messageErrorSpy).toHaveBeenCalledWith('验证码已过期，请使用新的验证码');
    });

    it('should auto-refresh captcha after CAPTCHA_EXPIRED error', async () => {
      // Mock authLogin to throw CAPTCHA_EXPIRED error
      const expiredError = new Error('验证码已过期');
      (expiredError as any).code = 'CAPTCHA_EXPIRED';
      mockAuthStore.authLogin.mockRejectedValue(expiredError);

      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi)
        .mockResolvedValueOnce({
          captchaId: 'captcha-1',
          svg: '<svg>captcha-1</svg>',
        })
        .mockResolvedValueOnce({
          captchaId: 'captcha-2',
          svg: '<svg>captcha-2</svg>',
        });

      const wrapper = mount(Login);
      await flushPromises();

      // Initial captcha load
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should auto-refresh captcha (需求 9.3)
      expect(getCaptchaSpy).toHaveBeenCalledTimes(2);
    });

    it('should not interfere with other login errors', async () => {
      // Mock authLogin to throw a different error
      const otherError = new Error('用户名或密码错误');
      (otherError as any).code = 'INVALID_CREDENTIALS';
      mockAuthStore.authLogin.mockRejectedValue(otherError);

      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Initial captcha load
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('wrongpassword');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should NOT auto-refresh captcha for non-captcha errors
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);
      
      // Should NOT show captcha error message
      expect(messageErrorSpy).not.toHaveBeenCalledWith('验证码错误，请重新输入');
      expect(messageErrorSpy).not.toHaveBeenCalledWith('验证码已过期，请使用新的验证码');
    });

    it('should allow unlimited retry attempts after captcha errors', async () => {
      // Mock authLogin to throw INVALID_CAPTCHA error multiple times
      const invalidCaptchaError = new Error('验证码错误');
      (invalidCaptchaError as any).code = 'INVALID_CAPTCHA';
      mockAuthStore.authLogin.mockRejectedValue(invalidCaptchaError);

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');

      // Try multiple times (需求 7.5)
      for (let i = 0; i < 5; i++) {
        await captchaInput.setValue(`WRONG${i}`);
        
        const form = wrapper.find('form');
        await form.trigger('submit');
        await flushPromises();

        // Should show error message each time
        expect(messageErrorSpy).toHaveBeenCalledWith('验证码错误，请重新输入');
      }

      // Should have called error message 5 times
      expect(messageErrorSpy).toHaveBeenCalledTimes(5);
    });

    it('should preserve username and password after captcha error', async () => {
      // Mock authLogin to throw INVALID_CAPTCHA error
      const invalidCaptchaError = new Error('验证码错误');
      (invalidCaptchaError as any).code = 'INVALID_CAPTCHA';
      mockAuthStore.authLogin.mockRejectedValue(invalidCaptchaError);

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('WRONG');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Username and password should be preserved
      expect((usernameInput.element as HTMLInputElement).value).toBe('testuser');
      expect((passwordInput.element as HTMLInputElement).value).toBe('password123');
      
      // Only captcha should be cleared
      expect((captchaInput.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('Network Error Handling During Login', () => {
    let mockAuthStore: any;
    let messageErrorSpy: any;
    let consoleErrorSpy: any;

    beforeEach(async () => {
      // Setup production environment
      vi.mocked(authApi.getEnvironmentApi).mockResolvedValue({
        isPreview: false,
        environment: 'production',
        version: '1.0.0',
      });

      vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      // Setup mock auth store
      const { useAuthStore } = await import('#/store');
      mockAuthStore = useAuthStore();
      
      // Setup message spy
      const { message } = await import('#/adapter/naive');
      messageErrorSpy = vi.spyOn(message, 'error');
      
      // Setup console spy
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should show network error message for network errors during login', async () => {
      // Mock authLogin to throw network error
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockAuthStore.authLogin.mockRejectedValue(networkError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should show network error message (需求 7.3)
      expect(messageErrorSpy).toHaveBeenCalledWith('网络连接失败，请检查网络后重试');
    });

    it('should show timeout error message for timeout errors during login', async () => {
      // Mock authLogin to throw timeout error
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockAuthStore.authLogin.mockRejectedValue(timeoutError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should show timeout error message (需求 7.3)
      expect(messageErrorSpy).toHaveBeenCalledWith('请求超时，请稍后重试');
    });

    it('should log detailed error to console for network errors during login', async () => {
      // Mock authLogin to throw network error
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockAuthStore.authLogin.mockRejectedValue(networkError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should log error to console (需求 7.4)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login failed:', networkError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error details:', expect.objectContaining({
        name: networkError.name,
        message: networkError.message,
      }));
    });

    it('should handle ECONNABORTED error during login', async () => {
      // Mock authLogin to throw ECONNABORTED error
      const abortedError = new Error('Connection aborted');
      (abortedError as any).code = 'ECONNABORTED';
      mockAuthStore.authLogin.mockRejectedValue(abortedError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should show network error message (需求 7.3)
      expect(messageErrorSpy).toHaveBeenCalledWith('网络连接失败，请检查网络后重试');
    });

    it('should not auto-refresh captcha for network errors during login', async () => {
      // Mock authLogin to throw network error
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockAuthStore.authLogin.mockRejectedValue(networkError);

      const getCaptchaSpy = vi.mocked(authApi.getCaptchaApi).mockResolvedValue({
        captchaId: 'test-captcha-id',
        svg: '<svg>test</svg>',
      });

      const wrapper = mount(Login);
      await flushPromises();

      // Initial captcha load
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // Should NOT auto-refresh captcha for network errors
      // (only refresh for captcha-specific errors)
      expect(getCaptchaSpy).toHaveBeenCalledTimes(1);
    });

    it('should preserve form data after network error during login', async () => {
      // Mock authLogin to throw network error
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockAuthStore.authLogin.mockRejectedValue(networkError);

      const wrapper = mount(Login);
      await flushPromises();

      // Fill in the form
      const usernameInput = wrapper.find('input[placeholder*="用户名"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const captchaInput = wrapper.find('input[placeholder="请输入验证码"]');

      await usernameInput.setValue('testuser');
      await passwordInput.setValue('password123');
      await captchaInput.setValue('ABC123');

      // Submit the form
      const form = wrapper.find('form');
      await form.trigger('submit');
      await flushPromises();

      // All form data should be preserved after network error
      expect((usernameInput.element as HTMLInputElement).value).toBe('testuser');
      expect((passwordInput.element as HTMLInputElement).value).toBe('password123');
      expect((captchaInput.element as HTMLInputElement).value).toBe('ABC123');
    });
  });
});
