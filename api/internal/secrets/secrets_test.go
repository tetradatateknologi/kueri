package secrets

import "testing"

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := []byte("kueri-dev-encryption-key-32b!!!!")
	box, err := NewBox(key)
	if err != nil {
		t.Fatal(err)
	}

	plain := "kueri_secret"
	enc, err := box.Encrypt(plain)
	if err != nil {
		t.Fatal(err)
	}
	if enc == plain {
		t.Fatal("expected ciphertext")
	}

	out, err := box.Decrypt(enc)
	if err != nil {
		t.Fatal(err)
	}
	if out != plain {
		t.Fatalf("got %q want %q", out, plain)
	}
}

func TestNewBoxRejectsInvalidKeySize(t *testing.T) {
	_, err := NewBox([]byte("short"))
	if err == nil {
		t.Fatal("expected error for short key")
	}
}
