using System.Security.Cryptography;
using System.Text;

namespace Listo.Api.Services;

public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
    byte[] EncryptBytes(byte[] plainBytes);
    byte[] DecryptBytes(byte[] cipherBytes);
}

public class EncryptionService : IEncryptionService
{
    // Marks a ciphertext produced by the current scheme (random IV prepended to
    // the ciphertext). Values without these markers are legacy data encrypted
    // with a static IV and are still decryptable via the fallback path below.
    private const string V2StringPrefix = "v2:";
    private static readonly byte[] V2BytesMagic = { 0x4C, 0x53, 0x54, 0x02 }; // "LST\x02"
    private const int IvSize = 16;

    private readonly byte[] _key;
    private readonly byte[] _legacyIv;

    public EncryptionService(IConfiguration configuration)
    {
        var encryptionKey = configuration["Encryption:Key"]
            ?? throw new InvalidOperationException("Encryption:Key not configured");
        // Use SHA256 to ensure 32-byte key for AES-256
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(encryptionKey));
        // Legacy IV (first 16 bytes of the key hash) — retained only to decrypt
        // data written before per-message random IVs were introduced.
        _legacyIv = _key.Take(IvSize).ToArray();
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;

        var combined = EncryptWithRandomIv(Encoding.UTF8.GetBytes(plainText));
        return V2StringPrefix + Convert.ToBase64String(combined);
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return string.Empty;

        if (cipherText.StartsWith(V2StringPrefix, StringComparison.Ordinal))
        {
            var combined = Convert.FromBase64String(cipherText[V2StringPrefix.Length..]);
            return Encoding.UTF8.GetString(DecryptWithEmbeddedIv(combined));
        }

        // Legacy: static-IV ciphertext with no marker.
        return Encoding.UTF8.GetString(DecryptWithStaticIv(Convert.FromBase64String(cipherText)));
    }

    public byte[] EncryptBytes(byte[] plainBytes)
    {
        if (plainBytes == null || plainBytes.Length == 0) return Array.Empty<byte>();

        var combined = EncryptWithRandomIv(plainBytes);
        var result = new byte[V2BytesMagic.Length + combined.Length];
        Buffer.BlockCopy(V2BytesMagic, 0, result, 0, V2BytesMagic.Length);
        Buffer.BlockCopy(combined, 0, result, V2BytesMagic.Length, combined.Length);
        return result;
    }

    public byte[] DecryptBytes(byte[] cipherBytes)
    {
        if (cipherBytes == null || cipherBytes.Length == 0) return Array.Empty<byte>();

        if (StartsWithMagic(cipherBytes))
        {
            var combined = cipherBytes[V2BytesMagic.Length..];
            return DecryptWithEmbeddedIv(combined);
        }

        // Legacy: static-IV ciphertext with no magic header.
        return DecryptWithStaticIv(cipherBytes);
    }

    // Encrypts with a freshly generated random IV, returning IV || ciphertext.
    private byte[] EncryptWithRandomIv(byte[] plainBytes)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var cipher = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var combined = new byte[aes.IV.Length + cipher.Length];
        Buffer.BlockCopy(aes.IV, 0, combined, 0, aes.IV.Length);
        Buffer.BlockCopy(cipher, 0, combined, aes.IV.Length, cipher.Length);
        return combined;
    }

    // Decrypts a IV || ciphertext buffer produced by EncryptWithRandomIv.
    private byte[] DecryptWithEmbeddedIv(byte[] combined)
    {
        if (combined.Length < IvSize)
            throw new ArgumentException("Ciphertext is too short to contain an IV.");

        using var aes = Aes.Create();
        aes.Key = _key;
        var iv = new byte[IvSize];
        Buffer.BlockCopy(combined, 0, iv, 0, IvSize);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(combined, IvSize, combined.Length - IvSize);
    }

    // Decrypts legacy data that was encrypted with the static key-derived IV.
    private byte[] DecryptWithStaticIv(byte[] cipherBytes)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.IV = _legacyIv;

        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
    }

    private static bool StartsWithMagic(byte[] data)
    {
        if (data.Length < V2BytesMagic.Length) return false;
        for (var i = 0; i < V2BytesMagic.Length; i++)
        {
            if (data[i] != V2BytesMagic[i]) return false;
        }
        return true;
    }
}
