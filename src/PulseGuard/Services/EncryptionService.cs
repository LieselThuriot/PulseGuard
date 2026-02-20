using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace PulseGuard.Services;

public sealed class EncryptionOptions
{
    public int SaltSize { get; set; } = 32;
    public int NonceSize { get; set; } = 12;
    public int TagSize { get; set; } = 16;
    public int KeySize { get; set; } = 32;
    public int Iterations { get; set; } = 600000;
    public string Password { get; set; } = "";
}

public sealed class EncryptionService(IOptions<EncryptionOptions> options)
{
    private readonly IOptions<EncryptionOptions> _options = options;

    public string Encrypt(string plaintext)
    {
        var options = _options.Value;

        byte[] plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        byte[] salt = RandomNumberGenerator.GetBytes(options.SaltSize);
        byte[] nonce = RandomNumberGenerator.GetBytes(options.NonceSize);

        byte[] bytes = Encoding.UTF8.GetBytes(options.Password);
        byte[] key = Rfc2898DeriveBytes.Pbkdf2(bytes, salt, options.Iterations, HashAlgorithmName.SHA256, options.KeySize);

        byte[] result = new byte[options.SaltSize + options.NonceSize + options.TagSize + plaintextBytes.Length];

        Span<byte> resultSpan = result.AsSpan();
        salt.CopyTo(resultSpan.Slice(0, options.SaltSize));
        nonce.CopyTo(resultSpan.Slice(options.SaltSize, options.NonceSize));

        Span<byte> tagSpan = resultSpan.Slice(options.SaltSize + options.NonceSize, options.TagSize);
        Span<byte> cipherSpan = resultSpan.Slice(options.SaltSize + options.NonceSize + options.TagSize);

        using (var aesGcm = new AesGcm(key, options.TagSize))
        {
            aesGcm.Encrypt(nonce, plaintextBytes, cipherSpan, tagSpan);
        }

        return Convert.ToBase64String(result);
    }

    public string Decrypt(string encryptedBase64)
    {
        var options = _options.Value;

        byte[] encryptedData = Convert.FromBase64String(encryptedBase64);
        ReadOnlySpan<byte> encryptedSpan = encryptedData.AsSpan();

        int minimumLength = options.SaltSize + options.NonceSize + options.TagSize;
        if (encryptedData.Length < minimumLength)
        {
            throw new CryptographicException("Invalid ciphertext length.");
        }

        ReadOnlySpan<byte> salt = encryptedSpan.Slice(0, options.SaltSize);
        ReadOnlySpan<byte> nonce = encryptedSpan.Slice(options.SaltSize, options.NonceSize);
        ReadOnlySpan<byte> tag = encryptedSpan.Slice(options.SaltSize + options.NonceSize, options.TagSize);
        ReadOnlySpan<byte> ciphertext = encryptedSpan.Slice(options.SaltSize + options.NonceSize + options.TagSize);

        byte[] key = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(options.Password),
            salt,
            options.Iterations,
            HashAlgorithmName.SHA256,
            options.KeySize);

        byte[] plaintextBytes = new byte[ciphertext.Length];

        using (var aesGcm = new AesGcm(key, options.TagSize))
        {
            aesGcm.Decrypt(nonce, ciphertext, tag, plaintextBytes);
        }

        return Encoding.UTF8.GetString(plaintextBytes);
    }
}
